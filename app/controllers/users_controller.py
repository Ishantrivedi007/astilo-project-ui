import cherrypy

from app.db import get_session
from app.models import User

VALID_ROLES = {"user", "admin"}


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
                return [u.to_dict() for u in session.query(User).order_by(User.created_at.desc()).all()]

            if user_id == "me":
                user = session.get(User, int(claims["sub"]))
            else:
                if claims.get("role") != "admin":
                    raise cherrypy.HTTPError(403, "Admin access required")
                user = session.get(User, int(user_id))

            if not user:
                raise cherrypy.HTTPError(404, "User not found")
            return user.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, user_id):
        body = cherrypy.request.json or {}
        role = body.get("role")
        if role is not None and role not in VALID_ROLES:
            raise cherrypy.HTTPError(400, f"role must be one of {sorted(VALID_ROLES)}")

        with get_session() as session:
            user = session.get(User, int(user_id))
            if not user:
                raise cherrypy.HTTPError(404, "User not found")

            claims = cherrypy.request.user
            if role and role != "admin" and user.id == int(claims["sub"]):
                raise cherrypy.HTTPError(400, "You can't demote yourself")

            if role:
                user.role = role
            if body.get("name"):
                user.name = body["name"].strip()

            session.flush()
            return user.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    def DELETE(self, user_id):
        claims = cherrypy.request.user
        if int(user_id) == int(claims["sub"]):
            raise cherrypy.HTTPError(400, "You can't delete your own account from here")

        with get_session() as session:
            user = session.get(User, int(user_id))
            if not user:
                raise cherrypy.HTTPError(404, "User not found")
            session.delete(user)
            return {"deleted": True}
