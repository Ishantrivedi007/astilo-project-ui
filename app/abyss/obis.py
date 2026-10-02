"""OBIS (Ocean Biodiversity Information System) adapter — no API key
required. https://api.obis.org/ — Abyss's primary marine occurrence source
(blueprint section 62). OBIS aggregates from many providers; its own policy
permits products built from its data where the underlying license allows,
with appropriate citation (hence every record is wrapped with provenance).
"""

from app.abyss.cache import cached_fetch
from app.abyss.http import abyss_get, envelope

BASE_URL = "https://api.obis.org/v3"


def search_occurrences(scientific_name: str, size: int = 20):
    """Real occurrence (observation) records for a species, with
    coordinates, depth and dataset attribution — feeds Species Distribution
    maps and the Discovery/Scan flow."""
    params = {"scientificname": scientific_name, "size": size}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/occurrence", params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("obis_occurrence", params, fetch, ttl_seconds=6 * 3600)
    results = [_normalize_occurrence(r) for r in raw.get("results", [])]
    return envelope(
        "OBIS",
        "occurrence",
        None,
        {"total": raw.get("total", 0), "results": results},
        raw,
        confidence="OBSERVED",
    )


def occurrence_years(scientific_name: str):
    """Yearly record counts — a lightweight signal for how well-observed a
    species is over time, used by Observation Gap Finder-style features."""
    params = {"scientificname": scientific_name}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/statistics/years", params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("obis_stats_years", params, fetch, ttl_seconds=24 * 3600)
    return envelope("OBIS", "statistics/years", None, {"years": raw.get("results", [])}, raw, confidence="OBSERVED")


def _normalize_occurrence(r: dict) -> dict:
    return {
        "id": r.get("id"),
        "scientificName": r.get("scientificName"),
        "decimalLatitude": r.get("decimalLatitude"),
        "decimalLongitude": r.get("decimalLongitude"),
        "depth": r.get("depth"),
        "eventDate": r.get("eventDate") or r.get("date_year"),
        "datasetName": r.get("datasetName"),
        "institutionCode": r.get("institutionCode"),
        "basisOfRecord": r.get("basisOfRecord"),
        "country": r.get("country"),
    }
