"""OpenAlex adapter — free, keyless. A `mailto` param opts into OpenAlex's
faster "polite pool" per its usage policy (a courtesy identifier, not a
secret — hardcoded, not env config)."""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

SEARCH_URL = "https://api.openalex.org/works"
_MAILTO = "astilo-app@example.com"


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    params = {"search": query, "per_page": limit, "mailto": _MAILTO}

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=12)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("openalex_search", params, fetch, ttl_seconds=24 * 3600)
    results = []
    for work in raw.get("results") or []:
        authorships = work.get("authorships") or []
        authors = ", ".join((a.get("author") or {}).get("display_name", "") for a in authorships[:3])
        year = work.get("publication_year")
        results.append({
            "title": work.get("display_name") or work.get("title"),
            "url": work.get("doi") or (work.get("primary_location") or {}).get("landing_page_url") or work.get("id"),
            "snippet": f"{authors}{f' ({year})' if year else ''}".strip(),
            "source": "OpenAlex",
            "externalId": work.get("id"),
        })
    return results
