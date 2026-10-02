"""WoRMS (World Register of Marine Species) adapter — no API key required.
https://www.marinespecies.org/rest/ — preferred authority for marine
taxonomy (Abyss blueprint section 62); license terms should be re-verified
against the live API docs before production use (see the license registry).
"""

from app.abyss.cache import cached_fetch
from app.abyss.http import abyss_get, envelope

BASE_URL = "https://www.marinespecies.org/rest"


def search_by_name(name: str, limit: int = 10):
    """Fuzzy name search — returns candidate AphiaRecords for a scientific
    or common name, e.g. 'octopus' or 'Octopus vulgaris'."""
    params = {"name": name}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/AphiaRecordsByName/{name}", params={"like": "true", "marine_only": "false"})
        if resp.status_code == 204:
            return []
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worms_search", params, fetch, ttl_seconds=24 * 3600) or []
    results = [_normalize_record(r) for r in raw[:limit]]
    return envelope("WoRMS", "AphiaRecordsByName", None, {"results": results}, raw, confidence="OBSERVED")


def record_by_id(aphia_id: int):
    """A single species' full taxonomic record."""
    params = {"aphiaId": aphia_id}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/AphiaRecordByAphiaID/{aphia_id}")
        if resp.status_code == 204:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worms_record", params, fetch, ttl_seconds=24 * 3600)
    if not raw:
        return None
    return envelope("WoRMS", "AphiaRecordByAphiaID", str(aphia_id), _normalize_record(raw), raw, confidence="OBSERVED")


def classification_by_id(aphia_id: int):
    """The full taxonomic lineage (Kingdom -> ... -> species) for a species."""
    params = {"aphiaId": aphia_id}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/AphiaClassificationByAphiaID/{aphia_id}")
        if resp.status_code == 204:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worms_classification", params, fetch, ttl_seconds=24 * 3600)
    lineage = _flatten_classification(raw) if raw else []
    return envelope("WoRMS", "AphiaClassificationByAphiaID", str(aphia_id), {"lineage": lineage}, raw, confidence="OBSERVED")


def distributions_by_id(aphia_id: int):
    """Known range/locality records for a species, independent of OBIS point
    occurrences — WoRMS's own curated distribution data."""
    params = {"aphiaId": aphia_id}

    def fetch():
        resp = abyss_get(f"{BASE_URL}/AphiaDistributionsByAphiaID/{aphia_id}")
        if resp.status_code == 204:
            return []
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("worms_distribution", params, fetch, ttl_seconds=24 * 3600) or []
    results = [
        {
            "locality": d.get("locality"),
            "higherGeography": d.get("higherGeography"),
            "recordStatus": d.get("recordStatus"),
            "establishmentMeans": d.get("establishmentMeans"),
        }
        for d in raw
    ]
    return envelope("WoRMS", "AphiaDistributionsByAphiaID", str(aphia_id), {"results": results}, raw, confidence="CURATED")


def _normalize_record(r: dict) -> dict:
    return {
        "aphiaId": r.get("AphiaID"),
        "scientificName": r.get("scientificname"),
        "authority": r.get("authority"),
        "status": r.get("status"),
        "rank": r.get("rank"),
        "kingdom": r.get("kingdom"),
        "phylum": r.get("phylum"),
        "className": r.get("class"),
        "order": r.get("order"),
        "family": r.get("family"),
        "genus": r.get("genus"),
        "isMarine": r.get("isMarine"),
        "isExtinct": r.get("isExtinct"),
        "validName": r.get("valid_name"),
        "validAphiaId": r.get("valid_AphiaID"),
        "citation": r.get("citation"),
    }


def _flatten_classification(node) -> list[dict]:
    chain = []
    while node:
        chain.append({"rank": node.get("rank"), "scientificName": node.get("scientificname"), "aphiaId": node.get("AphiaID")})
        node = node.get("child")
    return chain
