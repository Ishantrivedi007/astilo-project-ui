"""GBIF (Global Biodiversity Information Facility) adapter — no API key
required. https://api.gbif.org/ — supplementary biodiversity source
(blueprint section 62). GBIF occurrences carry per-record licenses (CC0,
CC BY, or CC BY-NC); every record here is checked against Astilo's
configured license policy before being returned, and rejected records are
dropped rather than silently included (see app/abyss/license_registry.py).
"""

from app.abyss.cache import cached_fetch
from app.abyss.http import abyss_get, envelope
from app.abyss.license_registry import is_dataset_allowed

BASE_URL = "https://api.gbif.org/v1"

_LICENSE_LABELS = {
    "CC0_1_0": "CC0",
    "CC_BY_4_0": "CC BY 4.0",
    "CC_BY_NC_4_0": "CC BY-NC 4.0",
    "CC_BY_NC_ND_4_0": "CC BY-NC-ND 4.0",
    "UNSPECIFIED": "Unspecified",
    "UNSUPPORTED": "Unspecified",
}


def search_species(query: str, limit: int = 5):
    params = {"q": query, "rank": "SPECIES", "limit": limit}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/species/search", params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("gbif_species_search", params, fetch, ttl_seconds=24 * 3600)
    results = [
        {
            "key": r.get("key"),
            "scientificName": r.get("scientificName"),
            "canonicalName": r.get("canonicalName"),
            "kingdom": r.get("kingdom"),
            "phylum": r.get("phylum"),
            "family": r.get("family"),
            "rank": r.get("rank"),
            "taxonomicStatus": r.get("taxonomicStatus"),
        }
        for r in raw.get("results", [])
    ]
    return envelope("GBIF", "species/search", None, {"results": results}, raw, confidence="OBSERVED")


def search_occurrences(scientific_name: str, limit: int = 50):
    """Returns only occurrences whose dataset license passes the configured
    ABYSS_ALLOW_CC0 / ABYSS_ALLOW_CC_BY / ABYSS_ALLOW_CC_BY_NC policy —
    filtered out records are counted but never included in the response."""
    params = {"scientificName": scientific_name, "limit": limit}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/occurrence/search", params=params)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("gbif_occurrence_search", params, fetch, ttl_seconds=6 * 3600)
    allowed = []
    excluded = 0
    for r in raw.get("results", []):
        license_label = _LICENSE_LABELS.get(r.get("license"), r.get("license") or "Unspecified")
        if not is_dataset_allowed(license_label):
            excluded += 1
            continue
        allowed.append(
            {
                "key": r.get("key"),
                "decimalLatitude": r.get("decimalLatitude"),
                "decimalLongitude": r.get("decimalLongitude"),
                "eventDate": r.get("eventDate"),
                "basisOfRecord": r.get("basisOfRecord"),
                "institutionCode": r.get("institutionCode"),
                "datasetKey": r.get("datasetKey"),
                "license": license_label,
            }
        )
    return envelope(
        "GBIF",
        "occurrence/search",
        None,
        {"total": raw.get("count", 0), "results": allowed, "excludedByLicense": excluded},
        raw,
        confidence="OBSERVED",
    )
