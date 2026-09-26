"""NASA PDS Ring-Moon Systems Node — OPUS (Outer Planets Unified Search).
No API key required.

Docs: https://opus.pds-rings.seti.org/opus/api/
Voyager's 1977-1990s imaging predates PDS4 entirely and isn't reachable
through the generic PDS4 Search API used for New Horizons — OPUS is the
Ring-Moon Systems Node's own purpose-built search over that legacy (VICAR
format) archive, with real per-observation metadata and a pre-rendered
browse JPEG for each result (the raw VICAR pixel data itself isn't decoded
here — the browse JPEG is real calibrated imagery, not a placeholder).
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

BASE_URL = "https://opus.pds-rings.seti.org/opus/api"

# Preference order — calibrated is the best "ready to look at" version;
# fall back progressively toward whatever browse JPEG actually exists.
_BROWSE_KEYS = ("vgiss_calib_browse", "vgiss_cleaned_browse", "vgiss_geomed_browse", "vgiss_raw_browse")


def search_images(target: str, instrument: str = "Voyager ISS", limit: int = 12):
    params = {"instrument": instrument, "target": target, "limit": limit}

    def fetch():
        resp = cosmos_get(f"{BASE_URL}/data.json", params=params, timeout=25, headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("opus_search", params, fetch, ttl_seconds=24 * 3600)

    rows = raw.get("page", [])
    results = [
        {
            "opusId": row[0],
            "instrument": row[1],
            "planet": row[2],
            "target": row[3],
            "observationStart": row[4],
            "durationSeconds": row[5],
        }
        for row in rows
    ]
    return envelope("NASA OPUS (Ring-Moon Systems Node)", "data", None, {"count": raw.get("available", len(results)), "results": results}, None)


def fetch_browse_image_url(opus_id: str) -> str | None:
    def fetch():
        resp = cosmos_get(f"{BASE_URL}/files/{opus_id}.json", timeout=20, headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("opus_files", {"opusId": opus_id}, fetch, ttl_seconds=24 * 3600)
    files = raw.get("data", {}).get(opus_id, {})
    for key in _BROWSE_KEYS:
        urls = files.get(key)
        if urls:
            for u in urls:
                if u.lower().endswith((".jpg", ".jpeg", ".png")):
                    return u
    return None
