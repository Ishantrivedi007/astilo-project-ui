"""Wikidata adapter — free, keyless. Uses the wbsearchentities Action API
endpoint, the sanctioned way to search entities programmatically."""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SEARCH_URL = "https://www.wikidata.org/w/api.php"
_HEADERS = {"User-Agent": "AstiloCosmos/1.0 (personal research app; contact: astilo-app@example.com)"}


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    params = {
        "action": "wbsearchentities",
        "search": query,
        "language": "en",
        "limit": limit,
        "format": "json",
    }

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=10, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikidata_search", params, fetch, ttl_seconds=24 * 3600)
    results = []
    for hit in raw.get("search") or []:
        results.append({
            "title": hit.get("label") or hit.get("id"),
            "url": hit.get("concepturi") or f"https://www.wikidata.org/wiki/{hit.get('id')}",
            "snippet": hit.get("description"),
            "source": "Wikidata",
            "externalId": hit.get("id"),
        })
    return results
