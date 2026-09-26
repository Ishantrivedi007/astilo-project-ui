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

    parsed = _parse_readings(cdf_files[0], variable)
    data = {"windowHours": hours, "files": cdf_files, **parsed}
    return envelope("NASA CDAWeb (SPDF)", dataset_id, variable, data, None)


def _variable_by_name(cdf_file: dict, name: str) -> dict | None:
    for v in cdf_file.get("cdfVariables", {}).get("variable", []):
        if v.get("name") == name:
            return v
    return None


def _records(var: dict | None) -> list[dict]:
    if not var:
        return []
    return var.get("cdfVarData", {}).get("record", [])


def _var_attribute(var: dict | None, name: str) -> str | None:
    if not var:
        return None
    for attr in var.get("cdfVAttributes", {}).get("attribute", []):
        if attr.get("name") == name:
            entries = attr.get("entry", [])
            return entries[0].get("value") if entries else None
    return None


def _parse_readings(cdf_file: dict, variable: str, max_readings: int = 12) -> dict:
    """Pulls real timestamps + the last few real value-arrays out of
    CDAWeb's deeply-nested CDF JSON, plus the frequency-channel labels a
    spectrogram variable like electric_field_timeseries is sampled at —
    real numbers straight from the archive, not summarized/paraphrased."""
    value_var = _variable_by_name(cdf_file, variable)
    epoch_records = _records(_variable_by_name(cdf_file, "epoch"))
    value_records = _records(value_var)
    freq_records = _records(_variable_by_name(cdf_file, "frequency"))

    units = _var_attribute(value_var, "UNITS")
    description = _var_attribute(value_var, "CATDESC")

    frequencies = None
    if freq_records:
        raw = freq_records[0].get("value", [""])[0]
        try:
            frequencies = [float(x) for x in raw.split()]
        except ValueError:
            frequencies = None

    readings = []
    for epoch_row, value_row in zip(epoch_records[-max_readings:], value_records[-max_readings:]):
        timestamp = (epoch_row.get("value") or [None])[0]
        raw_values = (value_row.get("value") or [""])[0]
        try:
            values = [float(x) for x in raw_values.split()]
        except ValueError:
            continue
        readings.append({"timestamp": timestamp, "values": values})

    return {
        "frequenciesHz": frequencies,
        "recentReadings": list(reversed(readings)),  # newest first
        "totalRecordsInWindow": len(value_records),
        "valueUnits": units,
        "valueDescription": description,
    }


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
