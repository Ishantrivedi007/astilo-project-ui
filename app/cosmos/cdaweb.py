"""NASA CDAWeb (Coordinated Data Analysis Web) REST API — the Space Physics
Data Facility's live heliophysics data archive. No API key required.

Docs: https://cdaweb.gsfc.nasa.gov/WebServices/REST/
Used here for Voyager 1/2's Plasma Waves instrument (PWS) datasets, which
are genuinely still being updated (cataloged through mid-2026 at time of
writing) — real spacecraft telemetry, not a stale historical archive.
"""

import datetime

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

BASE_URL = "https://cdaweb.gsfc.nasa.gov/WS/cdasr/1"
DATAVIEW = "sp_phys"


def fetch_recent_data(dataset_id: str, variable: str, end: datetime.datetime, hours: int = 168):
    """Fetches `hours` of a CDAWeb variable's real time-series values
    ending at `end` — deep-space instrument datasets are archived in
    batches with a real lag (sometimes months), so `end` should be the
    dataset's own cataloged coverage end (see dataset_time_range), not
    "now", or every request 404s against a window with no data yet.
    Returns the raw parsed JSON payload (embedded numeric arrays), or None
    if the window genuinely has no data."""
    start = end - datetime.timedelta(hours=hours)
    fmt = "%Y%m%dT%H%M%SZ"
    path = f"{BASE_URL}/dataviews/{DATAVIEW}/datasets/{dataset_id}/data/{start.strftime(fmt)},{end.strftime(fmt)}/{variable}"
    params = {"format": "json"}

    def fetch():
        resp = cosmos_get(path, params=params, timeout=45, headers={"Accept": "application/json"})
        if resp.status_code == 404:
            return {"CDF": []}
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch(f"cdaweb_{dataset_id}", {"dataset": dataset_id, "variable": variable, "end": end.isoformat(), "hours": hours}, fetch, ttl_seconds=6 * 3600)

    cdf_files = raw.get("CDF", [])
    if not cdf_files:
        return None

    return envelope("NASA CDAWeb (SPDF)", dataset_id, variable, {"windowHours": hours, "files": cdf_files}, None)


def dataset_time_range(dataset_id: str):
    """Returns the dataset's own cataloged start/end coverage — used to show
    a real 'data available through' date rather than implying live-streaming
    telemetry."""
    def fetch():
        resp = cosmos_get(
            f"{BASE_URL}/dataviews/{DATAVIEW}/datasets",
            params={"observatory": dataset_id.split("_")[0]},
            timeout=20,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("cdaweb_dataset_range", {"dataset": dataset_id}, fetch, ttl_seconds=24 * 3600)
    for ds in raw.get("DatasetDescription", []):
        if ds.get("Id") == dataset_id:
            return ds.get("TimeInterval")
    return None
