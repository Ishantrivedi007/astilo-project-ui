"""arXiv adapter — free, keyless. The Atom-feed query API is the sanctioned
way to search programmatically (no scraping). This is the only adapter in
app/cosmos that needs XML parsing, since arXiv doesn't offer JSON."""

import xml.etree.ElementTree as ET

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

SEARCH_URL = "http://export.arxiv.org/api/query"
_HEADERS = {"User-Agent": "AstiloCosmos/1.0 (personal research app; contact: astilo-app@example.com)"}
_ATOM_NS = "{http://www.w3.org/2005/Atom}"


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": limit,
    }

    def fetch():
        resp = cosmos_get(SEARCH_URL, params=params, timeout=15, headers=_HEADERS)
        resp.raise_for_status()
        return resp.text

    raw_xml = cached_fetch("arxiv_search", params, fetch, ttl_seconds=24 * 3600)

    results = []
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        return results

    for entry in root.findall(f"{_ATOM_NS}entry"):
        title_el = entry.find(f"{_ATOM_NS}title")
        summary_el = entry.find(f"{_ATOM_NS}summary")
        id_el = entry.find(f"{_ATOM_NS}id")
        title = (title_el.text or "").strip() if title_el is not None else None
        if not title:
            continue
        snippet = (summary_el.text or "").strip().replace("\n", " ") if summary_el is not None else None
        url = (id_el.text or "").strip() if id_el is not None else None
        results.append({
            "title": title,
            "url": url,
            "snippet": (snippet[:300] + "…") if snippet and len(snippet) > 300 else snippet,
            "source": "arXiv",
            "externalId": url.rsplit("/", 1)[-1] if url else None,
        })
    return results
