import cherrypy
import requests

from app import library
from app.db import get_session
from app.models import LIBRARY_SHELVES, LibraryEntry
from app.notify import notify


def _user_id():
    return int(cherrypy.request.user["sub"])


def _guard(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except requests.exceptions.Timeout:
        raise cherrypy.HTTPError(504, "Project Gutenberg / Gutendex timed out")
    except requests.exceptions.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Project Gutenberg / Gutendex request failed: {exc}")


class LibrarySearchController:
    """Browse/search the real Project Gutenberg catalog via Gutendex — no
    key required. ?topic= doubles as genre-tab filtering."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, topic=None, page=1):
        return _guard(library.search_books, q, topic, int(page))


class LibraryPdfSearchController:
    """Internet Archive search, scoped to real freely-downloadable PDFs —
    the complement to Gutendex's plain-text books."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, page=1):
        if not q:
            raise cherrypy.HTTPError(400, "q is required")
        return _guard(library.search_archive_pdfs, q, int(page))


class LibraryPdfUrlController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, identifier=None):
        if not identifier:
            raise cherrypy.HTTPError(400, "identifier is required")
        url = _guard(library.resolve_archive_pdf_url, identifier)
        if not url:
            raise cherrypy.HTTPError(404, "No freely-downloadable PDF found for this item (it may be lending-library only)")
        return {"pdfUrl": url}


class LibraryPdfProxyController:
    """Streams a resolved archive.org PDF through our own server.

    archive.org's /download/ URLs 302-redirect to a per-item storage node
    (e.g. iaXXXXXX.us.archive.org) that doesn't send permissive CORS
    headers, so pdf.js fetching the URL directly from the browser fails
    outright. Fetching it here (server-to-server, where CORS doesn't
    apply) and re-streaming it from our own origin fixes that."""

    exposed = True

    def GET(self, url=None):
        if not url or not url.startswith("https://archive.org/download/"):
            raise cherrypy.HTTPError(400, "url must be a resolved archive.org download URL")

        upstream = requests.get(url, stream=True, timeout=30, headers=library._HEADERS)
        if upstream.status_code != 200:
            raise cherrypy.HTTPError(502, f"Upstream PDF fetch failed ({upstream.status_code})")

        cherrypy.response.headers["Content-Type"] = "application/pdf"
        content_length = upstream.headers.get("Content-Length")
        if content_length:
            cherrypy.response.headers["Content-Length"] = content_length

        def stream():
            for chunk in upstream.iter_content(chunk_size=65536):
                if chunk:
                    yield chunk
            upstream.close()

        return stream()

    GET._cp_config = {"response.stream": True}


class LibraryOpenSearchController:
    """Open Library's free, keyless search — the broadest catalog of the
    three sources; each result may carry a public Internet Archive
    identifier, reusable with LibraryPdfUrlController to get a real PDF."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, page=1):
        if not q:
            raise cherrypy.HTTPError(400, "q is required")
        return _guard(library.search_open_library, q, int(page))


class LibraryCategoriesController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self):
        return {"categories": list(library.CATEGORIES)}


class LibraryBookController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, book_id):
        result = _guard(library.get_book, int(book_id))
        if result is None:
            raise cherrypy.HTTPError(404, f"No Gutenberg book with id {book_id}")
        return result


class LibraryBookContentController:
    """Fetches the book's real plain-text file from Gutenberg and splits it
    into chapters using the book's own heading lines — server-side, both to
    avoid CORS fetching gutenberg.org from the browser and to cache the
    (often large) raw text rather than re-downloading it per reader."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, text_url=None):
        if not text_url:
            raise cherrypy.HTTPError(400, "text_url is required")
        if not text_url.startswith("https://www.gutenberg.org/"):
            raise cherrypy.HTTPError(400, "text_url must be a gutenberg.org URL")

        raw_text = _guard(library.fetch_book_text, text_url)
        chapters = library.parse_chapters(raw_text)
        return {"chapterCount": len(chapters), "chapters": chapters}


class LibraryEntriesController:
    """The user's own Library shelf — full CRUD."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, shelf=None):
        user_id = _user_id()
        with get_session() as session:
            query = session.query(LibraryEntry).filter_by(user_id=user_id)
            if shelf:
                query = query.filter_by(shelf=shelf)
            entries = query.order_by(LibraryEntry.updated_at.desc()).all()
            return [e.to_dict() for e in entries]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        gutenberg_id = body.get("gutenbergId")
        title = (body.get("title") or "").strip()
        if not gutenberg_id or not title:
            raise cherrypy.HTTPError(400, "gutenbergId and title are required")
        user_id = _user_id()

        with get_session() as session:
            existing = session.query(LibraryEntry).filter_by(user_id=user_id, gutenberg_id=int(gutenberg_id)).first()
            if existing:
                return existing.to_dict()

            entry = LibraryEntry(
                user_id=user_id,
                gutenberg_id=int(gutenberg_id),
                title=title,
                authors=body.get("authors") or [],
                cover_url=body.get("coverUrl"),
                text_url=body.get("textUrl"),
                shelf=body.get("shelf") if body.get("shelf") in LIBRARY_SHELVES else "want_to_read",
            )
            session.add(entry)
            session.flush()
            notify(session, user_id, "library", f"Added to Library: {title}", link="/library")
            return entry.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, entry_id):
        body = cherrypy.request.json or {}
        user_id = _user_id()
        with get_session() as session:
            entry = session.query(LibraryEntry).filter_by(id=int(entry_id), user_id=user_id).first()
            if not entry:
                raise cherrypy.HTTPError(404, "Library entry not found")

            if "shelf" in body:
                if body["shelf"] not in LIBRARY_SHELVES:
                    raise cherrypy.HTTPError(400, f"shelf must be one of {LIBRARY_SHELVES}")
                entry.shelf = body["shelf"]
            if "lastChapterIndex" in body:
                entry.last_chapter_index = int(body["lastChapterIndex"])
            if "totalChapters" in body:
                entry.total_chapters = int(body["totalChapters"])
            if "notes" in body:
                entry.notes = body["notes"]

            session.flush()
            return entry.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, entry_id):
        user_id = _user_id()
        with get_session() as session:
            entry = session.query(LibraryEntry).filter_by(id=int(entry_id), user_id=user_id).first()
            if not entry:
                raise cherrypy.HTTPError(404, "Library entry not found")
            session.delete(entry)
            return {"deleted": True}
