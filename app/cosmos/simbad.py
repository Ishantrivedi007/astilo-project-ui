"""SIMBAD (CDS Strasbourg) generic object lookup — no API key required.

Used for object classes that don't have a dedicated mission catalog (mainly
galaxies), since SIMBAD's `basic` table covers essentially every named
astronomical object, not just stars. gaia.py already depends on SIMBAD for
name -> coordinate resolution; this adds the broader descriptive fields.
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SIMBAD_TAP_URL = "https://simbad.cds.unistra.fr/simbad/sim-tap/sync"

COLUMNS = "main_id,ra,dec,otype_txt,galdim_majaxis,galdim_minaxis,morph_type,rvz_redshift,sp_type,plx_value"


def lookup_object(name: str):
    adql = (
        f"select {COLUMNS} from basic join ident on oid = ident.oidref "
        f"where id = '{name.replace(chr(39), '')}'"
    )
    params = {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "json", "QUERY": adql}

    def fetch():
        resp = cosmos_get(SIMBAD_TAP_URL, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("simbad_object", params, fetch, ttl_seconds=24 * 3600)
    rows = raw.get("data", [])
    if not rows:
        return None

    fields = [c["name"] for c in raw.get("metadata", [])] or COLUMNS.split(",")
    row = dict(zip(fields, rows[0]))

    data = {
        "name": row.get("main_id"),
        "objectType": row.get("otype_txt"),
        "raDeg": row.get("ra"),
        "decDeg": row.get("dec"),
        "angularMajorAxisArcmin": row.get("galdim_majaxis"),
        "angularMinorAxisArcmin": row.get("galdim_minaxis"),
        "morphologicalType": row.get("morph_type"),
        "redshift": row.get("rvz_redshift"),
        "spectralType": row.get("sp_type"),
        "parallaxMas": row.get("plx_value"),
    }
    return envelope("SIMBAD (CDS Strasbourg)", "basic", row.get("main_id"), data, row)
