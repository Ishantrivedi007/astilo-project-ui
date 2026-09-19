import cherrypy

from app.db import get_session
from app.models import Notification


def _user_id():
    return int(cherrypy.request.user["sub"])


class NotificationsController:
    """Real, persisted notifications — GET (list, optionally filtered by
    module or unread-only), PUT (mark one or all read), DELETE (clear one
    or all)."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, module=None, unread_only=None, limit=100):
        user_id = _user_id()
        with get_session() as session:
            query = session.query(Notification).filter_by(user_id=user_id)
            if module:
                query = query.filter_by(module=module)
            if unread_only:
                query = query.filter_by(read=0)
            notifications = query.order_by(Notification.created_at.desc()).limit(int(limit)).all()
            unread_count = session.query(Notification).filter_by(user_id=user_id, read=0).count()
            return {
                "results": [n.to_dict() for n in notifications],
                "unreadCount": unread_count,
            }

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, notification_id=None):
        body = cherrypy.request.json or {}
        user_id = _user_id()
        with get_session() as session:
            if notification_id == "read-all" or body.get("markAllRead"):
                session.query(Notification).filter_by(user_id=user_id, read=0).update({"read": 1})
                return {"updated": "all"}

            notification = session.query(Notification).filter_by(id=int(notification_id), user_id=user_id).first()
            if not notification:
                raise cherrypy.HTTPError(404, "Notification not found")
            notification.read = 1 if body.get("read", True) else 0
            session.flush()
            return notification.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, notification_id=None):
        user_id = _user_id()
        with get_session() as session:
            if notification_id == "all":
                session.query(Notification).filter_by(user_id=user_id).delete()
                return {"deleted": "all"}

            notification = session.query(Notification).filter_by(id=int(notification_id), user_id=user_id).first()
            if not notification:
                raise cherrypy.HTTPError(404, "Notification not found")
            session.delete(notification)
            return {"deleted": True}
