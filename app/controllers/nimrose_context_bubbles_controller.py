import datetime

import cherrypy

from app.db import get_session
from app.models import NimroseContextBubble


def _user_id():
    return int(cherrypy.request.user["sub"])


class NimroseContextBubblesController:
    """Context Bubbles — temporary self-contained workspace sessions that
    remember state. A bubble's snapshot is immutable after capture (PUT
    only renames it); "restoring" is purely a frontend navigation, this
    controller just tracks last_restored_at for a recency-sorted list."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        with get_session() as session:
            bubbles = (
                session.query(NimroseContextBubble)
                .filter_by(user_id=_user_id())
                .order_by(NimroseContextBubble.created_at.desc())
                .all()
            )
            return [b.to_dict() for b in bubbles]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        snapshot = body.get("snapshot")
        if not name or not isinstance(snapshot, dict) or not snapshot.get("section"):
            raise cherrypy.HTTPError(400, "name and a snapshot with a section are required")

        with get_session() as session:
            bubble = NimroseContextBubble(
                user_id=_user_id(), name=name, icon=body.get("icon"), snapshot_json=snapshot,
            )
            session.add(bubble)
            session.flush()
            return bubble.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, bubble_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            bubble = session.query(NimroseContextBubble).filter_by(id=int(bubble_id), user_id=_user_id()).first()
            if not bubble:
                raise cherrypy.HTTPError(404, "Bubble not found")
            if "name" in body:
                bubble.name = (body["name"] or "").strip() or bubble.name
            if "icon" in body:
                bubble.icon = body["icon"] or None
            if body.get("restored"):
                bubble.last_restored_at = datetime.datetime.utcnow()
            session.flush()
            return bubble.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, bubble_id):
        with get_session() as session:
            bubble = session.query(NimroseContextBubble).filter_by(id=int(bubble_id), user_id=_user_id()).first()
            if not bubble:
                raise cherrypy.HTTPError(404, "Bubble not found")
            session.delete(bubble)
            return {"deleted": True}
