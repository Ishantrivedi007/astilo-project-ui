import cherrypy

from app.db import get_session
from app.models import User


class UsersController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, user_id=None):
        claims = cherrypy.request.user
        with get_session() as session:
            if user_id is None:
                if claims.get("role") != "admin":
                    raise cherrypy.HTTPError(403, "Admin access required")
                return [u.to_dict() for u in session.query(User).all()]

            if user_id == "me":
                user = session.get(User, int(claims["sub"]))
            else:
                if claims.get("role") != "admin":
                    raise cherrypy.HTTPError(403, "Admin access required")
                user = session.get(User, int(user_id))

            if not user:
                raise cherrypy.HTTPError(404, "User not found")
            return user.to_dict()
