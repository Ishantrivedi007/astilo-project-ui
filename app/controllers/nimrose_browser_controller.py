import cherrypy

from app.db import get_session
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


class NimroseBrowserSpacesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
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
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id), user_id=_user_id()).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
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
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id), user_id=_user_id()).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
            session.delete(space)
            return {"deleted": True}


class NimroseBrowserTabsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, space_id):
        with get_session() as session:
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id), user_id=_user_id()).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")
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
            space = session.query(NimroseBrowserSpace).filter_by(id=int(space_id), user_id=_user_id()).first()
            if not space:
                raise cherrypy.HTTPError(404, "Space not found")

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
            tab = (
                session.query(NimroseBrowserTab)
                .join(NimroseBrowserSpace)
                .filter(
                    NimroseBrowserTab.id == int(tab_id),
                    NimroseBrowserTab.space_id == int(space_id),
                    NimroseBrowserSpace.user_id == _user_id(),
                )
                .first()
            )
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
            tab = (
                session.query(NimroseBrowserTab)
                .join(NimroseBrowserSpace)
                .filter(
                    NimroseBrowserTab.id == int(tab_id),
                    NimroseBrowserTab.space_id == int(space_id),
                    NimroseBrowserSpace.user_id == _user_id(),
                )
                .first()
            )
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
