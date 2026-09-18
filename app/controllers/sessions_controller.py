import datetime

import cherrypy

from app.config import config
from app.db import get_session
from app.models import LoginEvent


class SessionsController:
    """Read-only sign-in history for the caller's own account."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = int(cherrypy.request.user["sub"])
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(hours=config.JWT_EXPIRY_HOURS)

        with get_session() as session:
            events = (
                session.query(LoginEvent)
                .filter_by(user_id=user_id)
                .order_by(LoginEvent.created_at.desc())
                .limit(20)
                .all()
            )
            return [
                {**e.to_dict(), "isActive": e.created_at is not None and e.created_at > cutoff}
                for e in events
            ]
