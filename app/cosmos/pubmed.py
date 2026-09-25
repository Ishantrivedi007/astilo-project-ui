"""PubMed adapter — free, keyless. Uses NCBI's E-utilities (esearch +
esummary), sending `tool`/`email` params per NCBI's usage policy (a
courtesy identifier, not a secret — hardcoded, not env config)."""

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get

ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
ESUMMARY_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
_CONTACT = {"tool": "AstiloCosmos", "email": "astilo-app@example.com"}


def search(query: str, limit: int = 10) -> list:
    """Normalized {title, url, snippet, source, externalId} results."""
    search_params = {**_CONTACT, "db": "pubmed", "term": query, "retmax": limit, "retmode": "json"}

    def fetch_ids():
        resp = cosmos_get(ESEARCH_URL, params=search_params, timeout=12)
        resp.raise_for_status()
        return resp.json()

    ids_raw = cached_fetch("pubmed_esearch", search_params, fetch_ids, ttl_seconds=24 * 3600)
    ids = (ids_raw.get("esearchresult") or {}).get("idlist") or []
    if not ids:
        return []

    summary_params = {**_CONTACT, "db": "pubmed", "id": ",".join(ids), "retmode": "json"}

    def fetch_summaries():
        resp = cosmos_get(ESUMMARY_URL, params=summary_params, timeout=12)
        resp.raise_for_status()
        return resp.json()

    summaries_raw = cached_fetch("pubmed_esummary", summary_params, fetch_summaries, ttl_seconds=24 * 3600)
    result_map = (summaries_raw.get("result") or {})

    results = []
    for pmid in ids:
        item = result_map.get(pmid)
        if not item:
            continue
        authors = ", ".join(a.get("name", "") for a in (item.get("authors") or [])[:3])
        results.append({
            "title": item.get("title"),
            "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "snippet": f"{authors} — {item.get('source', '')} ({item.get('pubdate', '')})".strip(" —"),
            "source": "PubMed",
            "externalId": pmid,
        })
    return results
