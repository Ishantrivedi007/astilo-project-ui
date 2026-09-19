"""Wikipedia adapter — free, keyless, no scraping involved.

Uses Wikipedia's own public REST/Action APIs (not HTML scraping), which is
the sanctioned way to fetch article content programmatically. A descriptive
User-Agent is required by Wikimedia's API etiquette policy.
"""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

SEARCH_URL = "https://en.wikipedia.org/w/api.php"
SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
ACTION_API_URL = "https://en.wikipedia.org/w/api.php"
# We fetch the *full* plaintext extract (no exchars cap) and truncate it
# ourselves at a sentence boundary — gives noticeably more detail than the
# Action API's 1200-char-per-request exchars cap would allow.
MAX_DETAILED_CHARS = 3500
_SKIP_IMAGE_HINTS = ("logo", "icon", "edit-ltr", "cscr-featured", "commons-logo", "red circle", "red_circle")

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


def detailed_extract(title: str) -> str | None:
    """Fetches the full plain-text article extract and truncates it to
    MAX_DETAILED_CHARS at a sentence boundary — several paragraphs of real
    article text, well beyond the short lead-section summary."""
    params = {
        "action": "query",
        "prop": "extracts",
        "explaintext": 1,
        "titles": title,
        "format": "json",
    }

    def fetch():
        resp = cosmos_get(ACTION_API_URL, params=params, timeout=12, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikipedia_extract", {"title": title}, fetch, ttl_seconds=7 * 24 * 3600)
    pages = raw.get("query", {}).get("pages") or {}
    for page in pages.values():
        extract = page.get("extract")
        if not extract:
            continue
        extract = extract.strip()
        if len(extract) <= MAX_DETAILED_CHARS:
            return extract
        cut = extract[:MAX_DETAILED_CHARS]
        last_break = max(cut.rfind(". "), cut.rfind(".\n"))
        return cut[: last_break + 1] if last_break > 0 else cut
    return None


def article_images(title: str, limit: int = 8) -> list[dict]:
    """Extra images found in the Wikipedia article itself (beyond its lead
    thumbnail) — filters out site chrome (logos/edit icons/rating badges),
    not just anything tagged as an image on the page."""
    params = {
        "action": "query",
        "generator": "images",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url|mime",
        "iiurlwidth": 400,
        "gimlimit": 30,
        "format": "json",
    }

    def fetch():
        resp = cosmos_get(ACTION_API_URL, params=params, timeout=12, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("wikipedia_article_images", {"title": title}, fetch, ttl_seconds=7 * 24 * 3600)
    pages = (raw.get("query", {}) or {}).get("pages") or {}

    results = []
    for page in pages.values():
        page_title = (page.get("title") or "").lower()
        if any(hint in page_title for hint in _SKIP_IMAGE_HINTS):
            continue
        info = (page.get("imageinfo") or [{}])[0]
        if not info.get("mime", "").startswith("image/") or "svg" in info.get("mime", ""):
            continue
        url = info.get("thumburl") or info.get("url")
        if not url:
            continue
        results.append({"title": page.get("title", "").replace("File:", ""), "url": url})
        if len(results) >= limit:
            break
    return results


def research_summary(query: str) -> dict:
    """Searches Wikipedia for `query` and returns the best-matching article's
    summary (short lead + a longer multi-paragraph extract), wrapped with
    source provenance. Used to give Cosmos objects a real, understandable,
    non-fabricated research summary."""
    titles = search_titles(query, limit=3)
    for title in titles:
        result = summary(title)
        if result and result.get("extract"):
            try:
                result["detailedExtract"] = detailed_extract(title)
            except Exception:
                result["detailedExtract"] = None
            try:
                result["articleImages"] = article_images(title)
            except Exception:
                result["articleImages"] = []
            return envelope("Wikipedia", "rest_v1/page/summary", title, result, None)
    return envelope("Wikipedia", "rest_v1/page/summary", query, {
        "title": None,
        "extract": None,
        "detailedExtract": None,
        "articleImages": [],
        "description": None,
        "thumbnailUrl": None,
        "pageUrl": None,
    }, None)
