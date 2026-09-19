"""Wikipedia adapter — free, keyless, no scraping involved.

Uses Wikipedia's own public REST/Action APIs (not HTML scraping), which is
the sanctioned way to fetch article content programmatically. A descriptive
User-Agent is required by Wikimedia's API etiquette policy.
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SEARCH_URL = "https://en.wikipedia.org/w/api.php"
SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"

_HEADERS = {"User-Agent": "AstiloCosmos/1.0 (personal research app; contact: astilo-app@example.com)"}


def search_titles(query: str, limit: int = 5) -> list[str]:
    """Finds the best-matching Wikipedia page titles for a free-text query."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": limit,
        "format": "json",
    }

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=10, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikipedia_search", params, fetch, ttl_seconds=24 * 3600)
    return [hit["title"] for hit in (raw.get("query", {}).get("search") or [])]


def summary(title: str) -> dict | None:
    """Fetches the lead-section summary + thumbnail for one Wikipedia page.
    Returns None if the title doesn't resolve to an article (404)."""

    def fetch():
        resp = cosmos_get(SUMMARY_URL.format(title=title.replace(" ", "_")), timeout=10, headers=_HEADERS)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikipedia_summary", {"title": title}, fetch, ttl_seconds=7 * 24 * 3600)
    if not raw:
        return None

    return {
        "title": raw.get("title"),
        "extract": raw.get("extract"),
        "description": raw.get("description"),
        "thumbnailUrl": (raw.get("thumbnail") or {}).get("source"),
        "pageUrl": (raw.get("content_urls") or {}).get("desktop", {}).get("page"),
    }


def research_summary(query: str) -> dict:
    """Searches Wikipedia for `query` and returns the best-matching article's
    summary, wrapped with source provenance. Used to give Cosmos objects a
    real, understandable, non-fabricated research summary."""
    titles = search_titles(query, limit=3)
    for title in titles:
        result = summary(title)
        if result and result.get("extract"):
            return envelope("Wikipedia", "rest_v1/page/summary", title, result, None)
    return envelope("Wikipedia", "rest_v1/page/summary", query, {
        "title": None,
        "extract": None,
        "description": None,
        "thumbnailUrl": None,
        "pageUrl": None,
    }, None)
