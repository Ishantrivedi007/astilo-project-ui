"""Open Library adapter — free, keyless."""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

SEARCH_URL = "https://openlibrary.org/search.json"
_HEADERS = {"User-Agent": "AstiloCosmos/1.0 (personal research app; contact: astilo-app@example.com)"}


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    params = {"q": query, "limit": limit}

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=12, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("openlibrary_search", params, fetch, ttl_seconds=24 * 3600)
    results = []
    for doc in raw.get("docs") or []:
        authors = ", ".join((doc.get("author_name") or [])[:3])
        year = doc.get("first_publish_year")
        key = doc.get("key")
        results.append({
            "title": doc.get("title"),
            "url": f"https://openlibrary.org{key}" if key else None,
            "snippet": f"{authors}{f' ({year})' if year else ''}".strip(),
            "source": "Open Library",
            "externalId": key,
        })
    return results
