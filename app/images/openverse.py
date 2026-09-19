"""Openverse — a free, keyless search across hundreds of millions of
openly-licensed images from across the internet (Flickr, Wikimedia
Commons, museums, etc.), each with real attribution/license metadata.
Used for "search the internet for images" on the Research page, as a
general-web complement to the NASA image library (which is astronomy-only).
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SEARCH_URL = "https://api.openverse.org/v1/images/"
_HEADERS = {"User-Agent": "AstiloResearch/1.0 (personal research app)"}


def search(query: str, limit: int = 12):
    params = {"q": query, "page_size": min(limit, 20)}

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=12, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("openverse_search", params, fetch, ttl_seconds=6 * 3600)

    results = [
        {
            "id": r.get("id"),
            "title": r.get("title") or query,
            "url": r.get("url"),
            "thumbnailUrl": r.get("thumbnail") or r.get("url"),
            "creator": r.get("creator"),
            "license": r.get("license"),
            "licenseUrl": r.get("license_url"),
            "provider": r.get("provider"),
            "landingUrl": r.get("foreign_landing_url"),
            "width": r.get("width"),
            "height": r.get("height"),
        }
        for r in (raw.get("results") or [])
    ]
    return envelope("Openverse", "images/search", None, {"count": len(results), "results": results})
