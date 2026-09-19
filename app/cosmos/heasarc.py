"""HEASARC (High Energy Astrophysics Science Archive Research Center)
adapter — no API key required.

Uses the Xamin VO TAP service (ADQL) to cone-search mission catalogs for
high-energy (X-ray/gamma-ray) observations — e.g. NuSTAR's master catalog,
useful for black holes and other X-ray sources that have no optical/visible
counterpart to search by. Object names are resolved to coordinates via
SIMBAD (reusing gaia.py's resolver) since HEASARC's catalogs key on
mission-assigned designations, not common names.

Docs: https://heasarc.gsfc.nasa.gov/xamin/vo/tap
"""

import base64
import struct
import xml.etree.ElementTree as ET

from app.cosmos.cache import cached_fetch
from app.cosmos.gaia import resolve_coordinates
from app.cosmos.http import cosmos_get, envelope

TAP_URL = "https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync"
VOTABLE_NS = {"v": "http://www.ivoa.net/xml/VOTable/v1.3"}

# Catalog -> (columns to select, human label). NuSTAR's master catalog is
# the most relevant free, keyless source for black-hole-class X-ray targets;
# more HEASARC catalogs can be added here following the same shape.
CATALOGS = {
    "numaster": {
        "label": "NuSTAR Master Catalog",
        "columns": "name,ra,dec,obsid,time,exposure_a,public_date",
    },
}


def _parse_votable(xml_bytes: bytes):
    root = ET.fromstring(xml_bytes)
    status = root.find(".//v:INFO[@name='QUERY_STATUS']", VOTABLE_NS)
    if status is not None and status.get("value") == "ERROR":
        raise ValueError(f"HEASARC TAP error: {status.text}")

    fields = [
        (f.get("name"), f.get("datatype"), f.get("arraysize"))
        for f in root.findall(".//v:FIELD", VOTABLE_NS)
    ]
    stream = root.find(".//v:STREAM", VOTABLE_NS)
    if stream is None or not (stream.text or "").strip():
        return []

    raw = base64.b64decode(stream.text.strip())
    rows = []
    pos = 0
    while pos < len(raw):
        row = {}
        for name, dtype, arraysize in fields:
            if dtype == "char" and arraysize == "*":
                (length,) = struct.unpack_from(">i", raw, pos)
                pos += 4
                row[name] = raw[pos : pos + length].decode(errors="replace")
                pos += length
            elif dtype == "double":
                (row[name],) = struct.unpack_from(">d", raw, pos)
                pos += 8
            elif dtype in ("int", "long"):
                fmt, size = (">q", 8) if dtype == "long" else (">i", 4)
                (row[name],) = struct.unpack_from(fmt, raw, pos)
                pos += size
            else:
                raise ValueError(f"Unhandled VOTABLE datatype: {dtype}")
        rows.append(row)
    return rows


def search_observations(name: str, catalog: str = "numaster", radius_deg: float = 0.2, limit: int = 10):
    if catalog not in CATALOGS:
        raise ValueError(f"Unknown HEASARC catalog '{catalog}'. Available: {', '.join(CATALOGS)}")

    coords = resolve_coordinates(name)
    if coords is None:
        return None
    ra, dec = coords

    columns = CATALOGS[catalog]["columns"]
    adql = (
        f"select top {int(limit)} {columns} from {catalog} "
        f"where 1=contains(point('ICRS', ra, dec), circle('ICRS', {ra}, {dec}, {radius_deg}))"
    )
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "votable", "QUERY": adql}

    def fetch():
        resp = cosmos_get(TAP_URL, params=params, timeout=25)
        resp.raise_for_status()
        return _parse_votable(resp.content)

    results = cached_fetch(f"heasarc_{catalog}", params, fetch, ttl_seconds=12 * 3600)

    return envelope(
        "HEASARC",
        CATALOGS[catalog]["label"],
        None,
        {"queriedName": name, "catalog": catalog, "count": len(results), "results": results},
        None,
    )
