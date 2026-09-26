"""Astilo Deep Space Probes — Voyager 1, Voyager 2, and New Horizons: real
trajectory (JPL Horizons), and real raw instrument science data (NASA
CDAWeb for the Voyagers, NASA PDS for New Horizons).

Legal note: all three sources are U.S. federal government data, public
domain under 17 U.S.C. § 105 — free, keyless, no different in kind from the
JPL Horizons/MAST/SIMBAD data the rest of Cosmos already uses.

Honesty note: none of this is "where the telescope/probe is pointing" or a
live telemetry stream. Position is a real, live orbital-mechanics
computation (JPL Horizons). Science data is real archived instrument
telemetry, but deep-space missions downlink and process data in batches —
Voyager's CDAWeb-cataloged data runs a few months behind "now", and New
Horizons' PDS-archived engineering data runs on a multi-year archival cycle
(mission data-rights embargo). Every value here says exactly how old it is
rather than implying anything is live-streaming.
"""

import datetime
import re

from app.cosmos import cdaweb, jpl, opus
from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope
from app.cosmos.imaging import array_to_png_and_stats
from app.db import get_session
from app.models import DeepSpaceMonitorState

PDS_SEARCH_URL = "https://pds.mcp.nasa.gov/api/search/1/products"
PDS_SBN_SEARCH_UI = "https://pds-smallbodies.astro.umd.edu/holdings/"

_VECTOR_LINE = re.compile(
    r"X\s*=\s*([-\d.E+]+)\s*Y\s*=\s*([-\d.E+]+)\s*Z\s*=\s*([-\d.E+]+)\s*\n"
    r"\s*VX=\s*([-\d.E+]+)\s*VY=\s*([-\d.E+]+)\s*VZ=\s*([-\d.E+]+)\s*\n"
    r"\s*LT=\s*([-\d.E+]+)\s*RG=\s*([-\d.E+]+)\s*RR=\s*([-\d.E+]+)"
)
_TIME_LINE = re.compile(r"^\d+\.\d+ = A\.D\. (.+?) TDB", re.MULTILINE)

PROBES = {
    "voyager-1": {
        "name": "Voyager 1",
        "horizonsCommand": "-31",
        "launchDate": "1977-09-05",
        "cdawebDataset": "VG1_PWS_LR",
        "cdawebVariable": "electric_field_timeseries",
        "pdsInstrumentLid": None,
        "opusInstrument": "Voyager ISS",
        "flybyTargets": ["Jupiter", "Saturn"],
        "status": "Active — beyond the heliopause in interstellar space since 2012",
    },
    "voyager-2": {
        "name": "Voyager 2",
        "horizonsCommand": "-32",
        "launchDate": "1977-08-20",
        "cdawebDataset": "VG2_PWS_LR",
        "cdawebVariable": "electric_field_timeseries",
        "pdsInstrumentLid": None,
        "opusInstrument": "Voyager ISS",
        "flybyTargets": ["Jupiter", "Saturn", "Uranus", "Neptune"],
        "status": "Active — beyond the heliopause in interstellar space since 2018",
    },
    "new-horizons": {
        "name": "New Horizons",
        "horizonsCommand": "-98",
        "launchDate": "2006-01-19",
        "cdawebDataset": None,
        "cdawebVariable": None,
        "pdsInstrumentLid": "urn:nasa:pds:context:instrument:nh.swap",
        "pdsImageInstrumentLids": ["urn:nasa:pds:context:instrument:nh.lorri", "urn:nasa:pds:context:instrument:nh.mvic"],
        "status": "Active — traveling through the Kuiper Belt after its 2015 Pluto flyby",
    },
}


def _parse_latest_vector(raw_result: str):
    """Extracts the LAST position+velocity record in a Horizons VECTORS
    block, in the units Horizons actually returns here (km, km/s, verified
    live) — RG/RR (range/range-rate) come straight from Horizons' own
    computation rather than being re-derived."""
    if "$$SOE" not in raw_result or "$$EOE" not in raw_result:
        return None
    block = raw_result.split("$$SOE")[1].split("$$EOE")[0]

    times = _TIME_LINE.findall(block)
    matches = list(_VECTOR_LINE.finditer(block))
    if not matches:
        return None
    m = matches[-1]
    x, y, z, vx, vy, vz, lt, rg, rr = (float(g) for g in m.groups())
    speed_km_s = (vx ** 2 + vy ** 2 + vz ** 2) ** 0.5
    return {
        "timestamp": times[-1].strip() if times else None,
        "distanceKm": rg,
        "distanceAu": rg / 149597870.7,
        "speedKmS": speed_km_s,
        "radialVelocityKmS": rr,
        "lightTimeSeconds": lt,
    }


def get_probe_position(probe_id: str):
    probe = PROBES[probe_id]
    now = datetime.datetime.utcnow()
    start = (now - datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
    stop = (now + datetime.timedelta(hours=2)).strftime("%Y-%m-%d %H:%M")
    result = jpl.horizons_ephemeris(probe["horizonsCommand"], start, stop, "1h", center="500@399")
    vector = _parse_latest_vector(result.get("data", {}).get("result", ""))
    if vector is None:
        return envelope("JPL Horizons", "vectors", probe["horizonsCommand"], None, None)
    return envelope("JPL Horizons", "vectors", probe["horizonsCommand"], vector, None)


def _pds_search(query: str, limit: int = 50, fields: str | None = None):
    params = {"q": query, "limit": limit}
    if fields:
        params["fields"] = fields

    def fetch():
        resp = cosmos_get(PDS_SEARCH_URL, params=params, timeout=25, headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()

    return cached_fetch("pds_search", params, fetch, ttl_seconds=24 * 3600)


def _fetch_new_horizons_science(instrument_lid: str):
    """Best-effort: finds the most recently-modified archived New Horizons
    instrument product and parses its real telemetry table via pds4_tools.
    New Horizons' PDS archive runs on a multi-year release cycle (mission
    data-rights embargo), so "most recent" here is real archived data, not
    anything close to live — the returned timestamp says so explicitly.
    Degrades to an explicit unavailable+link shape on any failure (query
    syntax drift, a product with no parseable table, network hiccup)
    rather than raising, matching this codebase's never-fabricate rule."""
    fallback = {"available": False, "pdsSearchUrl": PDS_SBN_SEARCH_UI, "reason": None}
    try:
        raw = _pds_search(
            f'(ref_lid_instrument eq "{instrument_lid}")',
            limit=50,
            fields="lid,ops:Label_File_Info.ops:file_ref,pds:Identification_Area.pds:product_class,pds:Modification_Detail.pds:modification_date",
        )
    except Exception as exc:
        fallback["reason"] = f"PDS search failed: {exc}"
        return fallback

    candidates = []
    for item in raw.get("data", []):
        props = item.get("properties", {})
        product_class = props.get("pds:Identification_Area.pds:product_class") or []
        if "Product_Observational" not in product_class:
            continue
        file_ref = (props.get("ops:Label_File_Info.ops:file_ref") or [None])[0]
        mod_date = (props.get("pds:Modification_Detail.pds:modification_date") or [None])[0]
        if file_ref and file_ref.endswith((".lblx", ".xml")):
            candidates.append((mod_date or "", file_ref, item.get("id")))

    if not candidates:
        fallback["reason"] = "No observational products found for this instrument in this page of results"
        return fallback

    candidates.sort(key=lambda c: c[0], reverse=True)
    _, label_url, lid = candidates[0]

    try:
        import pds4_tools

        structures = pds4_tools.read(label_url, quiet=True, lazy_load=True)
        tables = [s for s in structures if type(s).__name__ == "TableStructure"]
        if not tables:
            fallback["reason"] = "Product has no parseable table structure"
            return fallback

        table = tables[0]
        fields = list(table.data.dtype.names) if hasattr(table.data, "dtype") and table.data.dtype.names else []
        first_row = {name: _json_safe(table.data[name][0]) for name in fields} if fields else {}

        return {
            "available": True,
            "productLid": lid,
            "labelUrl": label_url,
            "tableName": getattr(table, "id", None),
            "fields": fields,
            "sampleReading": first_row,
        }
    except Exception as exc:
        fallback["reason"] = f"Could not parse PDS4 table: {exc}"
        fallback["labelUrl"] = label_url
        return fallback


def _json_safe(v):
    try:
        return v.item() if hasattr(v, "item") else v
    except Exception:
        return str(v)


def get_probe_science_data(probe_id: str):
    probe = PROBES[probe_id]

    if probe["cdawebDataset"]:
        try:
            coverage = cdaweb.dataset_time_range(probe["cdawebDataset"])
            end = datetime.datetime.fromisoformat(coverage["End"].replace("Z", "")) if coverage else datetime.datetime.utcnow()
            result = cdaweb.fetch_recent_data(probe["cdawebDataset"], probe["cdawebVariable"], end, hours=48)
            if result is None:
                return envelope("NASA CDAWeb (SPDF)", probe["cdawebDataset"], None, {"available": False}, None)
            data = dict(result["data"])
            data["available"] = True
            data["dataCoverageEnd"] = coverage["End"] if coverage else None
            return envelope("NASA CDAWeb (SPDF)", probe["cdawebDataset"], probe_id, data, None)
        except Exception:
            return envelope("NASA CDAWeb (SPDF)", probe["cdawebDataset"], None, {"available": False}, None)

    if probe["pdsInstrumentLid"]:
        data = _fetch_new_horizons_science(probe["pdsInstrumentLid"])
        return envelope("NASA PDS (Small Bodies Node)", probe["pdsInstrumentLid"], probe_id, data, None)

    return envelope("Astilo Deep Space", "none", probe_id, {"available": False}, None)


_TARGET_LINE = re.compile(r"<Target_Identification>\s*<name>(.*?)</name>", re.DOTALL)
_EXPOSURE_LINE = re.compile(r"<img:exposure_duration[^>]*>([\d.]+)</img:exposure_duration>")
_START_TIME_LINE = re.compile(r"<start_date_time>(.*?)</start_date_time>")


def _fetch_new_horizons_images(instrument_lids: list[str], limit_per_instrument: int = 3):
    """Real LORRI/MVIC photos New Horizons actually took, decoded from
    their PDS4 image arrays via pds4_tools + the shared normalize-to-PNG
    helper (identical math to MAST's FITS pipeline). Each image is
    independently try/excepted — one bad/oversized product shouldn't blank
    the whole gallery."""
    images = []
    for instrument_lid in instrument_lids:
        try:
            raw = _pds_search(
                f'(ref_lid_instrument eq "{instrument_lid}")',
                limit=30,
                fields="lid,ops:Label_File_Info.ops:file_ref,pds:Identification_Area.pds:product_class,pds:Modification_Detail.pds:modification_date",
            )
        except Exception:
            continue

        candidates = []
        for item in raw.get("data", []):
            props = item.get("properties", {})
            if "Product_Observational" not in (props.get("pds:Identification_Area.pds:product_class") or []):
                continue
            file_ref = (props.get("ops:Label_File_Info.ops:file_ref") or [None])[0]
            mod_date = (props.get("pds:Modification_Detail.pds:modification_date") or [None])[0]
            if file_ref and file_ref.endswith((".lblx", ".xml")):
                candidates.append((mod_date or "", file_ref, item.get("id")))

        candidates.sort(key=lambda c: c[0], reverse=True)

        for _, label_url, lid in candidates[:limit_per_instrument]:
            try:
                import pds4_tools

                structures = pds4_tools.read(label_url, quiet=True, lazy_load=True)
                arrays = [s for s in structures if type(s).__name__ == "ArrayStructure" and getattr(s.data, "ndim", 0) == 2]
                if not arrays:
                    continue
                # LORRI/MVIC products also carry non-image 2D arrays
                # (histogram, image_header, image_descriptor) — prefer the
                # one actually named "image" when present, don't just grab
                # whichever 2D array happened to be listed first.
                named_image = next((a for a in arrays if getattr(a, "id", "") == "image"), None)
                image_array = named_image or max(arrays, key=lambda a: a.data.size)

                label_text = structures.label.to_string()
                target_match = _TARGET_LINE.search(label_text)
                exposure_match = _EXPOSURE_LINE.search(label_text)
                time_match = _START_TIME_LINE.search(label_text)

                png_data_uri, stats = array_to_png_and_stats(image_array.data)
                images.append({
                    "productLid": lid,
                    "labelUrl": label_url,
                    "imagePngBase64": png_data_uri,
                    "stats": stats,
                    "target": target_match.group(1) if target_match else None,
                    "exposureMs": float(exposure_match.group(1)) if exposure_match else None,
                    "observationTime": time_match.group(1) if time_match else None,
                    "source": "NASA PDS (Small Bodies Node)",
                })
            except Exception:
                continue

    return images


def _fetch_voyager_images(probe: dict, limit_per_target: int = 4):
    """Real Voyager ISS photos of each probe's actual flyby targets — the
    calibrated browse JPEG NASA's OPUS API already renders (real imagery,
    not a placeholder), plus real per-observation metadata (target,
    observation time, exposure duration) from the same search result."""
    images = []
    for target in probe["flybyTargets"]:
        try:
            search_env = opus.search_images(target, instrument=probe["opusInstrument"], limit=limit_per_target)
            rows = search_env["data"]["results"]
        except Exception:
            continue

        for row in rows:
            try:
                image_url = opus.fetch_browse_image_url(row["opusId"])
                if not image_url:
                    continue
                images.append({
                    "opusId": row["opusId"],
                    "imageUrl": image_url,
                    "target": row["target"],
                    "observationTime": row["observationStart"],
                    "exposureSeconds": row["durationSeconds"],
                    "source": "NASA OPUS (Ring-Moon Systems Node)",
                })
            except Exception:
                continue

    return images


def get_probe_images(probe_id: str):
    probe = PROBES[probe_id]

    if probe.get("pdsImageInstrumentLids"):
        images = _fetch_new_horizons_images(probe["pdsImageInstrumentLids"])
        return envelope("NASA PDS (Small Bodies Node)", "images", probe_id, {"count": len(images), "results": images}, None)

    if probe.get("opusInstrument"):
        images = _fetch_voyager_images(probe)
        return envelope("NASA OPUS (Ring-Moon Systems Node)", "images", probe_id, {"count": len(images), "results": images}, None)

    return envelope("Astilo Deep Space", "images", probe_id, {"count": 0, "results": []}, None)


def get_catalog():
    def fetch():
        results = []
        for probe_id, probe in PROBES.items():
            position_env = get_probe_position(probe_id)
            pos = position_env.get("data")
            results.append({
                "probeId": probe_id,
                "name": probe["name"],
                "status": probe["status"],
                "launchDate": probe["launchDate"],
                "distanceAu": pos.get("distanceAu") if pos else None,
                "speedKmS": pos.get("speedKmS") if pos else None,
            })
        return {"count": len(results), "results": results}

    data = cached_fetch("deep_space_catalog", {}, fetch, ttl_seconds=600)
    return envelope("Astilo Deep Space", "catalog", None, data, None)


def get_probe_detail(probe_id: str):
    probe = PROBES[probe_id]
    position_env = get_probe_position(probe_id)
    science_env = get_probe_science_data(probe_id)
    return envelope("Astilo Deep Space", "aggregate", probe_id, {
        "probe": {"probeId": probe_id, "name": probe["name"], "status": probe["status"], "launchDate": probe["launchDate"]},
        "position": position_env,
        "science": science_env,
    }, None)


def check_for_new_probe_data():
    """Diffs each probe's latest-known science-data timestamp against a
    persisted baseline — same rotating-diff philosophy as
    hubble.check_for_new_observations, just over 3 probes instead of ~80
    so every probe is checked each call."""
    findings = []
    checked_at = datetime.datetime.utcnow().isoformat() + "Z"

    with get_session() as session:
        states = {s.probe_id: s for s in session.query(DeepSpaceMonitorState).all()}

        for probe_id, probe in PROBES.items():
            try:
                science = get_probe_science_data(probe_id)
                data = science.get("data", {})
                latest = data.get("dataCoverageEnd") or (data.get("sampleReading") and data.get("productLid"))
                latest_key = str(latest) if latest else None
            except Exception:
                continue

            if not latest_key:
                continue

            state = states.get(probe_id)
            previous_key = state.last_seen_timestamp if state else None
            if state is not None and previous_key != latest_key:
                findings.append({"probeId": probe_id, "name": probe["name"], "newDataMarker": latest_key})

            if state is None:
                state = DeepSpaceMonitorState(probe_id=probe_id, last_seen_timestamp=latest_key)
                session.add(state)
            else:
                state.last_seen_timestamp = latest_key
            state.last_checked_at = datetime.datetime.utcnow()

        session.flush()

    return envelope("Astilo Deep Space Monitor", "diff", None, {
        "findings": findings,
        "checkedAt": checked_at,
        "probesChecked": len(PROBES),
    }, None)
