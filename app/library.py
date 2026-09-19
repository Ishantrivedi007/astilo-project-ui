"""Library — free, keyless Project Gutenberg access via Gutendex
(gutendex.com, a public read-only API wrapping the real Gutenberg
catalog) for search/browse, plus a parser that turns Gutenberg's raw
plain-text ebooks into real chapters for the reader."""

import re

from app.cosmos.cache import cached_fetch
from app.cosmos.http import cosmos_get, envelope

GUTENDEX_BASE = "https://gutendex.com/books"
_HEADERS = {"User-Agent": "AstiloLibrary/1.0 (personal reading app)"}

# Gutendex's own curated "bookshelf" categories double as genre tabs.
CATEGORIES = (
    "Fiction",
    "Adventure",
    "Science Fiction",
    "Mystery",
    "Romance",
    "Poetry",
    "Philosophy",
    "History",
    "Children's Literature",
    "Drama",
)


def _normalize(book: dict) -> dict:
    formats = book.get("formats") or {}
    text_url = next((v for k, v in formats.items() if k.startswith("text/plain")), None)
    cover_url = next((v for k, v in formats.items() if k.startswith("image/")), None)
    return {
        "id": book.get("id"),
        "title": book.get("title"),
        "authors": [a.get("name") for a in (book.get("authors") or []) if a.get("name")],
        "subjects": book.get("subjects") or [],
        "bookshelves": book.get("bookshelves") or [],
        "summary": (book.get("summaries") or [None])[0],
        "languages": book.get("languages") or [],
        "downloadCount": book.get("download_count"),
        "coverUrl": cover_url,
        "textUrl": text_url,
        "hasText": bool(text_url),
    }


def search_books(query: str | None = None, topic: str | None = None, page: int = 1):
    params = {"page": page}
    if query:
        params["search"] = query
    if topic:
        params["topic"] = topic

    def fetch():
        resp = cosmos_get(GUTENDEX_BASE + "/", params=params, timeout=15, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("gutendex_search", params, fetch, ttl_seconds=6 * 3600)
    results = [_normalize(b) for b in (raw.get("results") or [])]
    return envelope(
        "Project Gutenberg (via Gutendex)", "books/search", query or topic,
        {"count": raw.get("count", len(results)), "hasNext": bool(raw.get("next")), "results": results},
    )


def get_book(book_id: int):
    def fetch():
        resp = cosmos_get(f"{GUTENDEX_BASE}/{book_id}", timeout=15, headers=_HEADERS)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("gutendex_book", {"id": book_id}, fetch, ttl_seconds=24 * 3600)
    if not raw:
        return None
    return envelope("Project Gutenberg (via Gutendex)", "books/id", str(book_id), _normalize(raw))


_START_RE = re.compile(r"\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", re.IGNORECASE)
_END_RE = re.compile(r"\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK", re.IGNORECASE)
# A chapter/section heading sits alone on its own line, e.g. "Chapter 7",
# "CHAPTER VII", "Letter 2", "BOOK ONE", "Part III".
_HEADING_RE = re.compile(
    r"^[ \t]*((?:CHAPTER|Chapter|LETTER|Letter|BOOK|Book|PART|Part)\s+[IVXLCDM\d]+\.?[ \t]*[-—:]?[ \t]*[A-Za-z ,'’]*)[ \t]*$",
    re.MULTILINE,
)


def _strip_boilerplate(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    start_match = _START_RE.search(text)
    end_match = _END_RE.search(text)
    start = start_match.end() if start_match else 0
    end = end_match.start() if end_match else len(text)
    return text[start:end].strip()


def parse_chapters(raw_text: str, max_chapters: int = 200) -> list[dict]:
    """Splits a stripped Gutenberg text into real chapters using the book's
    own heading lines. Falls back to fixed-size sections only if no
    headings are found at all, so short stories still get *something*
    to page through."""
    body = _strip_boilerplate(raw_text)
    headings = list(_HEADING_RE.finditer(body))

    chapters = []
    if headings:
        for i, m in enumerate(headings[:max_chapters]):
            heading = m.group(1).strip()
            start = m.end()
            end = headings[i + 1].start() if i + 1 < len(headings) else len(body)
            content = body[start:end].strip()
            if content:
                chapters.append({"heading": heading, "text": content})
    if not chapters:
        chunk_size = 3000
        for i in range(0, len(body), chunk_size):
            chapters.append({"heading": f"Section {i // chunk_size + 1}", "text": body[i : i + chunk_size].strip()})

    return chapters


ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"
ARCHIVE_METADATA_URL = "https://archive.org/metadata/{identifier}"


def search_archive_pdfs(query: str, page: int = 1, rows: int = 20):
    """Internet Archive's free, keyless search — a second real source
    (archive.org's own public-domain text collection) specifically for
    PDFs, since Gutenberg/Gutendex essentially never has one."""
    params = {
        "q": f"title:({query}) AND mediatype:texts AND format:PDF",
        "fl[]": ["identifier", "title", "creator", "year"],
        "rows": rows,
        "page": page,
        "output": "json",
    }

    def fetch():
        resp = cosmos_get(ARCHIVE_SEARCH_URL, params=params, timeout=15, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("archive_pdf_search", params, fetch, ttl_seconds=6 * 3600)
    docs = ((raw.get("response") or {}).get("docs")) or []
    results = [
        {
            "identifier": d.get("identifier"),
            "title": d.get("title"),
            "creator": d.get("creator"),
            "year": d.get("year"),
            "coverUrl": f"https://archive.org/services/img/{d.get('identifier')}",
        }
        for d in docs
        if d.get("identifier")
    ]
    return envelope("Internet Archive", "advancedsearch", query, {"count": (raw.get("response") or {}).get("numFound", len(results)), "results": results})


def resolve_archive_pdf_url(identifier: str) -> str | None:
    """Looks up the item's real file list and returns the actual
    downloadable PDF URL — only an unencrypted "Text PDF" (Internet
    Archive marks lending-library/DRM copies as "ACS Encrypted PDF",
    which isn't freely downloadable, so those are skipped rather than
    handed back as if they worked)."""

    def fetch():
        resp = cosmos_get(ARCHIVE_METADATA_URL.format(identifier=identifier), timeout=15, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("archive_metadata", {"id": identifier}, fetch, ttl_seconds=7 * 24 * 3600)
    for f in raw.get("files") or []:
        if f.get("format") == "Text PDF" and f.get("name", "").lower().endswith(".pdf"):
            return f"https://archive.org/download/{identifier}/{f['name']}"
    return None


OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"


def search_open_library(query: str, page: int = 1, limit: int = 20):
    """Open Library's free, keyless search — the broadest of the three
    sources (millions of editions, not just Gutenberg's ~76k or Archive's
    texts collection). Each result's own `ia` (Internet Archive)
    identifiers double as a way into the same free-PDF pipeline used for
    direct Archive search, when Open Library reports public (non-lending)
    access."""
    params = {
        "q": query,
        "page": page,
        "limit": limit,
        "fields": "key,title,author_name,cover_i,ia,ebook_access,first_publish_year",
    }

    def fetch():
        resp = cosmos_get(OPEN_LIBRARY_SEARCH_URL, params=params, timeout=15, headers=_HEADERS)
        resp.raise_for_status()
        return resp.json()

    raw = cached_fetch("open_library_search", params, fetch, ttl_seconds=6 * 3600)
    docs = raw.get("docs") or []
    results = []
    for d in docs:
        ia_ids = d.get("ia") or []
        results.append(
            {
                "key": d.get("key"),
                "title": d.get("title"),
                "authors": d.get("author_name") or [],
                "firstPublishYear": d.get("first_publish_year"),
                "coverUrl": f"https://covers.openlibrary.org/b/id/{d['cover_i']}-M.jpg" if d.get("cover_i") else None,
                "ebookAccess": d.get("ebook_access"),
                "iaIdentifier": ia_ids[0] if ia_ids and d.get("ebook_access") == "public" else None,
            }
        )
    return envelope("Open Library", "search.json", query, {"count": raw.get("numFound", len(results)), "results": results})


def fetch_book_text(text_url: str) -> str:
    def fetch():
        resp = cosmos_get(text_url, timeout=20, headers=_HEADERS)
        resp.raise_for_status()
        resp.encoding = resp.encoding or "utf-8"
        return resp.text

    return cached_fetch("gutenberg_text", {"url": text_url}, fetch, ttl_seconds=30 * 24 * 3600)
