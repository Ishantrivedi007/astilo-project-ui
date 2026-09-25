import ipaddress
import re
import socket
from urllib.parse import urlparse

import cherrypy
import jwt
import requests

from app.auth import decode_token
from app.db import get_session
from app.nimrose_access import require_project_access
from app.models import (
    DEFAULT_BROWSER_SPACES,
    NimroseBookmark,
    NimroseBrowserSpace,
    NimroseBrowserTab,
    NimroseHistoryEntry,
)

HISTORY_LIMIT = 500  # oldest entries beyond this are pruned on write


def _user_id():
    return int(cherrypy.request.user["sub"])


def _space_access(session, space, user_id, min_role="viewer"):
    """A Space belongs to a project (shared per membership) or is personal
    (project_id None, owner-only) — same personal/shared split as tasks,
    notes and calendar events."""
    if space.project_id:
        require_project_access(session, space.project_id, user_id, min_role=min_role)
    elif space.user_id != user_id:
        raise cherrypy.HTTPError(404, "Space not found")


class NimroseBrowserSpacesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, project_id=None):
        with get_session() as session:
            if project_id:
                require_project_access(session, project_id, _user_id(), min_role="viewer")
                spaces = (
                    session.query(NimroseBrowserSpace)
                    .filter_by(project_id=int(project_id))
                    .order_by(NimroseBrowserSpace.position.asc())
                    .all()
                )
                return [s.to_dict() for s in spaces]

            spaces = (
                session.query(NimroseBrowserSpace)
                .filter_by(user_id=_user_id())
                .order_by(NimroseBrowserSpace.position.asc())
                .all()
            )
            if not spaces:
                # Seed the spec's default Spaces on first use rather than
                # handing back an empty shell.
                for i, name in enumerate(DEFAULT_BROWSER_SPACES):
                    space = NimroseBrowserSpace(user_id=_user_id(), name=name, position=i)
                    session.add(space)
                session.flush()
                spaces = (
                    session.query(NimroseBrowserSpace)
                    .filter_by(user_id=_user_id())
                    .order_by(NimroseBrowserSpace.position.asc())
                    .all()
                )
            return [s.to_dict() for s in spaces]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        if not name:
            raise cherrypy.HTTPError(400, "name is required")

        with get_session() as session:
            max_position = (
                session.query(NimroseBrowserSpace).filter_by(user_id=_user_id()).count()
            )
            space = NimroseBrowserSpace(user_id=_user_id(), name=name, position=max_position)
            session.add(space)
            session.flush()
            return space.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, space_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="editor")
            if "name" in body:
                space.name = (body["name"] or "").strip() or space.name
            if "position" in body:
                space.position = int(body["position"])
            session.flush()
            return space.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, space_id):
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="editor")
            session.delete(space)
            return {"deleted": True}


class NimroseBrowserTabsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, space_id):
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="viewer")
            return [t.to_dict() for t in space.tabs]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, space_id):
        body = cherrypy.request.json or {}
        url = (body.get("url") or "").strip()
        if not url:
            raise cherrypy.HTTPError(400, "url is required")

        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="editor")

            position = session.query(NimroseBrowserTab).filter_by(space_id=space.id).count()
            tab = NimroseBrowserTab(space_id=space.id, url=url, title=body.get("title"), position=position)
            session.add(tab)
            session.flush()
            return tab.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, space_id, tab_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="editor")
            tab = session.query(NimroseBrowserTab).filter_by(id=int(tab_id), space_id=int(space_id)).first()
            if not tab:
                raise cherrypy.HTTPError(404, "Tab not found")
            if "url" in body:
                tab.url = body["url"] or tab.url
            if "title" in body:
                tab.title = body["title"]
            if "position" in body:
                tab.position = int(body["position"])
            session.flush()
            return tab.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, space_id, tab_id):
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id)).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            _space_access(session, space, _user_id(), min_role="editor")
            tab = session.query(NimroseBrowserTab).filter_by(id=int(tab_id), space_id=int(space_id)).first()
            if not tab:
                raise cherrypy.HTTPError(404, "Tab not found")
            session.delete(tab)
            return {"deleted": True}


class NimroseBookmarksController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, space_id=None, read_later=None):
        with get_session() as session:
            query = session.query(NimroseBookmark).filter_by(user_id=_user_id())
            if space_id:
                query = query.filter_by(space_id=int(space_id))
            if read_later is not None:
                query = query.filter_by(read_later=1 if read_later in ("1", "true", True) else 0)
            bookmarks = query.order_by(NimroseBookmark.created_at.desc()).all()
            return [b.to_dict() for b in bookmarks]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        url = (body.get("url") or "").strip()
        if not url:
            raise cherrypy.HTTPError(400, "url is required")

        with get_session() as session:
            bookmark = NimroseBookmark(
                user_id=_user_id(),
                space_id=body.get("spaceId"),
                url=url,
                title=body.get("title"),
                read_later=1 if body.get("readLater") else 0,
            )
            session.add(bookmark)
            session.flush()
            return bookmark.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, bookmark_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            bookmark = session.query(NimroseBookmark).filter_by(id=int(bookmark_id), user_id=_user_id()).first()
            if not bookmark:
                raise cherrypy.HTTPError(404, "Bookmark not found")
            if "title" in body:
                bookmark.title = body["title"]
            if "readLater" in body:
                bookmark.read_later = 1 if body["readLater"] else 0
            if "spaceId" in body:
                bookmark.space_id = body["spaceId"]
            session.flush()
            return bookmark.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, bookmark_id):
        with get_session() as session:
            bookmark = session.query(NimroseBookmark).filter_by(id=int(bookmark_id), user_id=_user_id()).first()
            if not bookmark:
                raise cherrypy.HTTPError(404, "Bookmark not found")
            session.delete(bookmark)
            return {"deleted": True}


class NimroseHistoryController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, limit=100, q=None):
        with get_session() as session:
            query = session.query(NimroseHistoryEntry).filter_by(user_id=_user_id())
            if q:
                like = f"%{q}%"
                query = query.filter((NimroseHistoryEntry.url.ilike(like)) | (NimroseHistoryEntry.title.ilike(like)))
            entries = query.order_by(NimroseHistoryEntry.visited_at.desc()).limit(int(limit)).all()
            return [e.to_dict() for e in entries]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        url = (body.get("url") or "").strip()
        if not url:
            raise cherrypy.HTTPError(400, "url is required")

        with get_session() as session:
            entry = NimroseHistoryEntry(user_id=_user_id(), url=url, title=body.get("title"))
            session.add(entry)
            session.flush()

            # Prune anything beyond HISTORY_LIMIT so this table doesn't grow
            # unbounded for a feature nobody explicitly manages.
            total = session.query(NimroseHistoryEntry).filter_by(user_id=_user_id()).count()
            if total > HISTORY_LIMIT:
                stale = (
                    session.query(NimroseHistoryEntry)
                    .filter_by(user_id=_user_id())
                    .order_by(NimroseHistoryEntry.visited_at.asc())
                    .limit(total - HISTORY_LIMIT)
                    .all()
                )
                for row in stale:
                    session.delete(row)

            return entry.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, entry_id=None):
        with get_session() as session:
            if entry_id:
                entry = session.query(NimroseHistoryEntry).filter_by(id=int(entry_id), user_id=_user_id()).first()
                if not entry:
                    raise cherrypy.HTTPError(404, "History entry not found")
                session.delete(entry)
                return {"deleted": True}

            # No id — clear all history for this user.
            session.query(NimroseHistoryEntry).filter_by(user_id=_user_id()).delete()
            return {"cleared": True}


PROXY_TIMEOUT_SECONDS = 12
PROXY_MAX_BYTES = 6 * 1024 * 1024  # 6MB — enough for a typical HTML document
PROXY_USER_AGENT = "Mozilla/5.0 (compatible; AstiloNimroseBrowser/1.0)"


def _is_public_hostname(hostname: str) -> bool:
    """Blocks the classic SSRF targets — loopback/private/link-local/
    reserved addresses — so this endpoint can't be pointed at our own
    infrastructure (localhost, the Docker/host network, cloud metadata
    endpoints, etc) by supplying a crafted URL."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False
    return True


class NimroseBrowserProxyController:
    """Best-effort proxy so pages that block iframe embedding (via
    X-Frame-Options / frame-ancestors CSP) can still be viewed inside
    Nimrose's Browser — we control our own response headers regardless of
    what the origin site sends, so those headers are simply never
    forwarded. The proxied HTML gets a <base> tag pointing at the real
    page, so relative links/images/stylesheets still resolve against the
    origin site rather than against this endpoint.

    This is NOT a full reverse proxy: only the top-level document is
    proxied, everything else (scripts, XHR/fetch calls, images) loads
    directly from the origin site and is subject to that site's own CORS
    policy as usual. Pages that need cookies/login, or that are heavy
    client-side SPAs with strict same-origin APIs, will often still fail —
    that's what the Browser's "open in new tab" fallback is for. Never
    point this at a page requiring authentication; credentials would pass
    through this server.

    Auth note: a plain <iframe src> request can't carry an Authorization
    header, so this endpoint accepts the JWT as a `token` query param
    instead of the usual header (validated the same way either path).
    """

    exposed = True

    def GET(self, url=None, token=None):
        if not token:
            raise cherrypy.HTTPError(401, "Missing token")
        try:
            decode_token(token)
        except jwt.ExpiredSignatureError:
            raise cherrypy.HTTPError(401, "Token expired")
        except jwt.InvalidTokenError:
            raise cherrypy.HTTPError(401, "Invalid token")

        if not url:
            raise cherrypy.HTTPError(400, "url is required")

        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise cherrypy.HTTPError(400, "Only http/https URLs are supported")
        if not _is_public_hostname(parsed.hostname):
            raise cherrypy.HTTPError(403, "Refusing to proxy a private/internal address")

        try:
            resp = requests.get(
                url,
                timeout=PROXY_TIMEOUT_SECONDS,
                headers={"User-Agent": PROXY_USER_AGENT},
                stream=True,
            )
        except requests.exceptions.RequestException as exc:
            raise cherrypy.HTTPError(502, f"Could not load page: {exc}")

        content_type = resp.headers.get("Content-Type", "text/html; charset=utf-8")
        try:
            body = resp.raw.read(PROXY_MAX_BYTES + 1, decode_content=True)
        finally:
            resp.close()
        if len(body) > PROXY_MAX_BYTES:
            raise cherrypy.HTTPError(502, "Page too large to proxy")

        cherrypy.response.headers["Content-Type"] = content_type
        cherrypy.response.headers["X-Astilo-Proxied-From"] = resp.url

        if "text/html" in content_type.lower():
            html = body.decode(resp.encoding or "utf-8", errors="replace")
            if "<base " not in html.lower() and "<base>" not in html.lower():
                base_tag = f'<base href="{resp.url}">'
                new_html, count = re.subn(r"(<head[^>]*>)", rf"\1{base_tag}", html, count=1, flags=re.IGNORECASE)
                html = new_html if count else base_tag + html
            return html.encode("utf-8")

        return body
