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
        "opusInstrument": "Voyager ISS",
        "opusIdPrefix": "vg-iss-1-",
        # Real closest-approach dates, ± a real encounter-window margin —
        # scopes OPUS's cross-spacecraft "Voyager ISS" search to this
        # probe's own flyby instead of returning Voyager 1 for everything.
        "flybyWindows": {
            "Jupiter": ("1979-02-01", "1979-04-15"),  # closest approach 1979-03-05
            "Saturn": ("1980-10-01", "1980-12-15"),  # closest approach 1980-11-12
        },
        "status": "Active — beyond the heliopause in interstellar space since 2012",
    },
    "voyager-2": {
        "name": "Voyager 2",
        "horizonsCommand": "-32",
        "launchDate": "1977-08-20",
        "cdawebDataset": "VG2_PWS_LR",
        "cdawebVariable": "electric_field_timeseries",
        "opusInstrument": "Voyager ISS",
        "opusIdPrefix": "vg-iss-2-",
        "flybyWindows": {
            "Jupiter": ("1979-06-01", "1979-08-15"),  # closest approach 1979-07-09
            "Saturn": ("1981-07-01", "1981-09-15"),  # closest approach 1981-08-25
            "Uranus": ("1985-11-01", "1986-02-15"),  # closest approach 1986-01-24
            "Neptune": ("1989-06-01", "1989-09-15"),  # closest approach 1989-08-25
        },
        "status": "Active — beyond the heliopause in interstellar space since 2018",
    },
    "new-horizons": {
        "name": "New Horizons",
        "horizonsCommand": "-98",
        "launchDate": "2006-01-19",
        "cdawebDataset": None,
        "cdawebVariable": None,
        # Explicit per-encounter collections, not a generic instrument
        # search — the generic ref_lid_instrument search only ever surfaces
        # the Arrokoth-era (KEM1) delivery in practice (a huge, arbitrarily
        # -ordered result set with the 2015 Pluto encounter buried in it),
        # so each real encounter is named directly via its own collection.
        "pdsScienceCollections": [
            "urn:nasa:pds:nh_swap:pluto_raw",
            "urn:nasa:pds:nh_swap:kem1_raw",
        ],
        "pdsImageCollections": [
            "urn:nasa:pds:nh_lorri:pluto_raw",
            "urn:nasa:pds:nh_mvic:pluto_raw",
            "urn:nasa:pds:nh_lorri:kem1_raw",
            "urn:nasa:pds:nh_mvic:kem1_cal",
        ],
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


_FIELD_BLOCK = re.compile(r"<Field_(?:Binary|Character)>.*?</Field_(?:Binary|Character)>", re.DOTALL)
_FIELD_NAME = re.compile(r"<name>(.*?)</name>")
_FIELD_DESC = re.compile(r"<description>(.*?)</description>", re.DOTALL)
_FIELD_UNITS_HINT = re.compile(r"Units:\s*([^\s]+(?:\s[^\s]+)?)\s*(?:$|Byte|Bit|Type)")

# Tables that carry spacecraft engineering/health data, not the actual
# science measurement — deprioritized in favor of a genuine science table
# (e.g. "Summary") when a product has both, same real-data-first principle
# as MAST's calibrated-over-raw product preference elsewhere in this file.
_NON_SCIENCE_TABLE_NAMES = {"housekeeping", "housekeeping table", "thrusters", "thrusters table"}


def _parse_field_descriptions(label_text: str) -> dict[str, dict]:
    """Real per-field descriptions straight from the PDS4 label's own
    <description> elements (e.g. "An estimate of the solar wind density")
    — not something guessed from the field name. Where the label states a
    real unit it's kept; where it says "N/A" (true for most of SWAP's raw
    telemetry fields — this is uncalibrated instrument counts, not a
    physical unit), that's surfaced honestly rather than invented."""
    result = {}
    for block in _FIELD_BLOCK.findall(label_text):
        name_match = _FIELD_NAME.search(block)
        desc_match = _FIELD_DESC.search(block)
        if not name_match or not desc_match:
            continue
        desc = " ".join(desc_match.group(1).split())
        # Full label reads "Full Mnemonic: X  General Description: Y   Subsystem: ...";
        # the "General Description" segment is the human-readable part worth surfacing.
        general = re.search(r"General Description:\s*(.*?)\s*Subsystem:", desc)
        clean_desc = general.group(1) if general else desc
        units_match = _FIELD_UNITS_HINT.search(desc)
        units = units_match.group(1).strip() if units_match else None
        result[name_match.group(1)] = {"description": clean_desc, "units": units}
    return result


def _fetch_new_horizons_science(collection_lids: list[str]):
    """Real New Horizons SWAP (Solar Wind Around Pluto) instrument
    telemetry, spanning BOTH real encounters explicitly named in
    `collection_lids` (Pluto 2015, Arrokoth 2019/KEM1) — same reasoning as
    _fetch_new_horizons_images: a generic ref_lid_instrument search only
    ever surfaces one encounter in practice. Each collection's most
    recently-modified product is parsed via pds4_tools; a real per-field
    description is pulled straight from the PDS4 label (never invented),
    and several real rows (not just one) are returned so the reading looks
    like actual instrument output, not a single cherry-picked number.
    Degrades to an explicit unavailable+link shape only if every
    collection fails."""
    fallback = {"available": False, "pdsSearchUrl": PDS_SBN_SEARCH_UI, "reason": None}
    readings_by_encounter = []

    for collection_lid in collection_lids:
        try:
            raw = _pds_collection_members(collection_lid, limit=20)
        except Exception:
            continue

        candidates = []
        for item in raw.get("data", []):
            props = item.get("properties", {})
            if "Product_Observational" not in (props.get("pds:Identification_Area.pds:product_class") or []):
                continue
            file_ref = (props.get("ops:Label_File_Info.ops:file_ref") or [None])[0]
            if file_ref and file_ref.endswith((".lblx", ".xml")):
                candidates.append((file_ref, item.get("id")))

        if not candidates:
            continue

        # Not every product in a collection has an actual science table —
        # some packet types (e.g. Pluto's "Coarse Histogram" raw products)
        # only carry Housekeeping/Thrusters engineering tables. Try a
        # handful of candidates until one has a real, non-engineering
        # table rather than accepting whichever happens to be first.
        import pds4_tools

        found = None
        for label_url, lid in candidates[:8]:
            try:
                structures = pds4_tools.read(label_url, quiet=True, lazy_load=True)
                tables = [s for s in structures if type(s).__name__ == "TableStructure"]
                science_table = next(
                    (t for t in tables if (getattr(t, "id", "") or "").lower() not in _NON_SCIENCE_TABLE_NAMES),
                    None,
                )
                if science_table is None:
                    continue
                fields = list(science_table.data.dtype.names) if hasattr(science_table.data, "dtype") and science_table.data.dtype.names else []
                if not fields:
                    continue
                found = (structures, label_url, lid, science_table, fields)
                break
            except Exception:
                continue

        if found is None:
            continue
        structures, label_url, lid, science_table, fields = found

        try:
            row_count = min(5, len(science_table.data))
            rows = [{name: _json_safe(science_table.data[name][i]) for name in fields} for i in range(row_count)]

            label_text = structures.label.to_string()
            field_info = _parse_field_descriptions(label_text)

            readings_by_encounter.append({
                "collection": collection_lid,
                "productLid": lid,
                "labelUrl": label_url,
                "tableName": getattr(science_table, "id", None),
                "fields": fields,
                "fieldInfo": {name: field_info[name] for name in fields if name in field_info},
                "rows": rows,
            })
        except Exception:
            continue

    if not readings_by_encounter:
        fallback["reason"] = "No parseable SWAP products found across any known encounter collection"
        return fallback

    # Prefer a "Summary"-named table (the real per-period solar-wind
    # estimate) as the headline encounter shown at the top level; any
    # engineering-only table that slipped through still appears in
    # `encounters` for whichever collection produced it.
    primary = next((e for e in readings_by_encounter if "summary" in (e["tableName"] or "").lower()), readings_by_encounter[0])
    return {
        "available": True,
        "productLid": primary["productLid"],
        "labelUrl": primary["labelUrl"],
        "tableName": primary["tableName"],
        "fields": primary["fields"],
        "fieldInfo": primary["fieldInfo"],
        "sampleReading": primary["rows"][0] if primary["rows"] else {},
        "recentRows": primary["rows"],
        "encounters": readings_by_encounter,
    }


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
            data.pop("files", None)  # raw CDF blob (megabytes) — recentReadings/frequenciesHz already extracted the useful values
            data["available"] = True
            data["dataCoverageEnd"] = coverage["End"] if coverage else None
            return envelope("NASA CDAWeb (SPDF)", probe["cdawebDataset"], probe_id, data, None)
        except Exception:
            return envelope("NASA CDAWeb (SPDF)", probe["cdawebDataset"], None, {"available": False}, None)

    if probe.get("pdsScienceCollections"):
        data = _fetch_new_horizons_science(probe["pdsScienceCollections"])
        return envelope("NASA PDS (Small Bodies Node)", "nh.swap", probe_id, data, None)

    return envelope("Astilo Deep Space", "none", probe_id, {"available": False}, None)


_TARGET_LINE = re.compile(r"<Target_Identification>\s*<name>(.*?)</name>", re.DOTALL)
_EXPOSURE_LINE = re.compile(r"<img:exposure_duration[^>]*>([\d.]+)</img:exposure_duration>")
_START_TIME_LINE = re.compile(r"<start_date_time>(.*?)</start_date_time>")


def _pds_collection_members(collection_lid: str, limit: int = 20):
    """Lists real products belonging to one named PDS4 collection (e.g. one
    specific encounter's LORRI raw-data delivery) via the /members
    endpoint — more reliable than the generic ref_lid_instrument search,
    which returns a huge (tens of thousands), arbitrarily-ordered result
    set that in practice never surfaces older encounters (e.g. the 2015
    Pluto flyby was never seen in the first several hundred generic-search
    results, though it's real, present data)."""
    params = {"limit": limit, "fields": "lid,ops:Label_File_Info.ops:file_ref,pds:Identification_Area.pds:product_class"}

    def fetch():
        resp = cosmos_get(f"{PDS_SEARCH_URL}/{collection_lid}/members", params=params, timeout=25, headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()

    return cached_fetch("pds_members", {"collection": collection_lid, "limit": limit}, fetch, ttl_seconds=24 * 3600)


def _fetch_new_horizons_images(collection_lids: list[str], limit_per_collection: int = 3):
    """Real LORRI/MVIC photos New Horizons actually took, decoded from
    their PDS4 image arrays via pds4_tools + the shared normalize-to-PNG
    helper (identical math to MAST's FITS pipeline). Each image is
    independently try/excepted — one bad/oversized product shouldn't blank
    the whole gallery. `collection_lids` names each real encounter/
    instrument delivery explicitly (see PROBES) so the gallery actually
    spans New Horizons' real targets (Pluto/Charon in 2015, Arrokoth in
    2019) instead of only ever showing whichever one a generic search
    happens to surface first."""
    images = []
    for collection_lid in collection_lids:
        try:
            raw = _pds_collection_members(collection_lid, limit=limit_per_collection * 4)
        except Exception:
            continue

        candidates = []
        for item in raw.get("data", []):
            props = item.get("properties", {})
            if "Product_Observational" not in (props.get("pds:Identification_Area.pds:product_class") or []):
                continue
            file_ref = (props.get("ops:Label_File_Info.ops:file_ref") or [None])[0]
            if file_ref and file_ref.endswith((".lblx", ".xml")):
                candidates.append((file_ref, item.get("id")))

        for label_url, lid in candidates[:limit_per_collection]:
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


def _fetch_voyager_images(probe: dict, limit_per_target: int = 6):
    """Real Voyager ISS photos of each probe's actual flyby targets — the
    calibrated browse JPEG NASA's OPUS API already renders (real imagery,
    not a placeholder), plus real per-observation metadata (target,
    observation time, exposure duration) from the same search result.

    OPUS's `instrument=Voyager ISS` filter covers BOTH spacecraft (it has
    no separate "Voyager 1 ISS"/"Voyager 2 ISS" value) — for a target both
    probes visited (Jupiter, Saturn), an unfiltered search returns Voyager
    1's earlier flyby first every time, so Voyager 2's own gallery would
    silently show Voyager 1's photos. Each opusId encodes which spacecraft
    took it (`vg-iss-1-...`/`vg-iss-2-...`), so a wider candidate pool is
    fetched per target and filtered down to the right probe."""
    images = []
    for target, (time1, time2) in probe["flybyWindows"].items():
        try:
            search_env = opus.search_images(target, instrument=probe["opusInstrument"], limit=limit_per_target * 3, time1=time1, time2=time2)
            rows = search_env["data"]["results"]
        except Exception:
            continue

        # The time window should already isolate this probe's own flyby;
        # the opusId-prefix check is a cheap belt-and-suspenders guard
        # against an edge case at a window boundary.
        matched = [r for r in rows if r["opusId"].startswith(probe["opusIdPrefix"])][:limit_per_target]

        for row in matched:
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

    if probe.get("pdsImageCollections"):
        images = _fetch_new_horizons_images(probe["pdsImageCollections"])
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
