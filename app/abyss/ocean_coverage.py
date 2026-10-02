"""Real, OBIS-driven regional observation coverage — not a fabricated
"knowledge score". Shows actual record/species/dataset counts per ocean
region straight from OBIS's /statistics endpoint with a bounding box, so
users can see where real sampling is sparse versus dense — Abyss's
Observation Gap Finder (blueprint section 40)."""

import math

from app.abyss.cache import cached_fetch
from app.abyss.http import abyss_get, envelope

OBIS_STATS_URL = "https://api.obis.org/v3/statistics"

# Bounding boxes deliberately avoid crossing the antimeridian (OBIS's WKT
# geometry parser doesn't handle a polygon spanning -180/180 as a single
# contiguous region the way a real mid-Pacific area would need).
REGIONS = [
    {"id": "north-atlantic", "label": "North Atlantic", "bbox": (-70, 20, -10, 50)},
    {"id": "south-atlantic", "label": "South Atlantic", "bbox": (-50, -40, 10, 0)},
    {"id": "indian-ocean", "label": "Indian Ocean", "bbox": (50, -30, 100, 10)},
    {"id": "eastern-pacific", "label": "Eastern Pacific", "bbox": (-150, -10, -80, 30)},
    {"id": "coral-triangle", "label": "Coral Triangle (W. Pacific)", "bbox": (110, -10, 150, 10)},
    {"id": "southern-ocean", "label": "Southern Ocean", "bbox": (-180, -80, 180, -60)},
    {"id": "arctic-ocean", "label": "Arctic Ocean", "bbox": (-180, 66, 180, 90)},
]


def _polygon(bbox: tuple[float, float, float, float]) -> str:
    minx, miny, maxx, maxy = bbox
    return f"POLYGON(({minx} {miny}, {minx} {maxy}, {maxx} {maxy}, {maxx} {miny}, {minx} {miny}))"


def _fetch_region_stats(region: dict) -> dict | None:
    params = {"geometry": _polygon(region["bbox"])}

    def fetch(p=params):
        resp = abyss_get(OBIS_STATS_URL, params=p, timeout=20)
        resp.raise_for_status()
        return resp.json()

    try:
        return cached_fetch(f"obis_region_stats_{region['id']}", params, fetch, ttl_seconds=24 * 3600)
    except Exception:
        return None


def regional_coverage():
    results = []
    for region in REGIONS:
        stats = _fetch_region_stats(region)
        results.append({
            "id": region["id"],
            "label": region["label"],
            "records": stats.get("records") if stats else None,
            "species": stats.get("species") if stats else None,
            "datasets": stats.get("datasets") if stats else None,
            "yearRange": stats.get("yearrange") if stats else None,
        })

    return envelope("OBIS", "statistics (regional bounding box)", None, {"regions": results}, confidence="OBSERVED")


COVERAGE_METHODOLOGY = (
    "Astilo Data Coverage is NOT a measure of how much biodiversity exists, or how well it's "
    "understood — only of how many real OBIS occurrence records fall within a region. It's "
    "computed as a log-scaled index: index = round(100 * log10(records + 1) / log10(max_records + 1)) "
    "across the regions Astilo tracks, where max_records is the best-sampled region in the current "
    "comparison set. A low score means sparse sampling, not necessarily sparse life — the two are "
    "easy to conflate, which is exactly why Abyss shows the real record counts alongside the index "
    "rather than the index alone."
)


def coverage_index():
    """Ocean Knowledge Map (blueprint section 39): a log-scaled index of
    real OBIS sampling density per region, always shown with its real
    record counts and documented methodology — never as a bare, unexplained
    "Scientific Knowledge = X%" figure."""
    results = []
    raw_records = {}
    for region in REGIONS:
        stats = _fetch_region_stats(region)
        records = stats.get("records") if stats else 0
        raw_records[region["id"]] = records or 0
        results.append({"id": region["id"], "label": region["label"], "records": records})

    max_records = max(raw_records.values()) if raw_records else 0
    for r in results:
        if max_records > 0 and r["records"]:
            r["coverageIndex"] = round(100 * math.log10(r["records"] + 1) / math.log10(max_records + 1))
        else:
            r["coverageIndex"] = 0

    data = {"regions": sorted(results, key=lambda r: r["coverageIndex"]), "methodology": COVERAGE_METHODOLOGY}
    return envelope("Astilo (derived from real OBIS statistics)", "astilo_coverage_index", None, data, confidence="CURATED")
