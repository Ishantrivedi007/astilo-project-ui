"""Crossref adapter — free, keyless. A `mailto` param opts into Crossref's
faster "polite pool" per its usage policy (a courtesy identifier, not a
secret — hardcoded, not env config)."""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

SEARCH_URL = "https://api.crossref.org/works"
_MAILTO = "astilo-app@example.com"


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    params = {"query": query, "rows": limit, "mailto": _MAILTO}

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=12)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("crossref_search", params, fetch, ttl_seconds=24 * 3600)
    results = []
    for item in (raw.get("message") or {}).get("items") or []:
        titles = item.get("title") or []
        title = titles[0] if titles else None
        if not title:
            continue
        authors = ", ".join(
            f"{a.get('given', '')} {a.get('family', '')}".strip() for a in (item.get("author") or [])[:3]
        )
        year = ((item.get("published") or {}).get("date-parts") or [[None]])[0][0]
        doi = item.get("DOI")
        results.append({
            "title": title,
            "url": f"https://doi.org/{doi}" if doi else item.get("URL"),
            "snippet": f"{authors}{f' ({year})' if year else ''}".strip(),
            "source": "Crossref",
            "externalId": doi,
        })
    return results
