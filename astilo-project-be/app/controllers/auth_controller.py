import cherrypy

from app.auth import create_token, hash_password, verify_password
from app.db import get_session
from app.models import User


class AuthController:
    exposed = True

    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, action=None):
        if action == "register":
            return self._register()
        if action == "login":
            return self._login()
        raise cherrypy.HTTPError(404, "Unknown auth action")

    def _register(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        if not name or not email or len(password) < 6:
            raise cherrypy.HTTPError(400, "name, email and a password of 6+ chars are required")

        with get_session() as session:
            if session.query(User).filter_by(email=email).first():
                raise cherrypy.HTTPError(409, "Email already registered")

            # Bootstrap: the very first account on a fresh install becomes admin,
            # so there's always a way in without touching the database by hand.
            role = "admin" if session.query(User).count() == 0 else "user"

            user = User(name=name, email=email, password_hash=hash_password(password), role=role)
            session.add(user)
            session.flush()
            token = create_token(user)
            return {"token": token, "user": user.to_dict()}

    def _login(self):
        body = cherrypy.request.json or {}
        email = (body.get("email") or "").strip().lower()
        password = body.get("password") or ""

        with get_session() as session:
            user = session.query(User).filter_by(email=email).first()
            if not user or not verify_password(password, user.password_hash):
                raise cherrypy.HTTPError(401, "Invalid email or password")

            token = create_token(user)
            return {"token": token, "user": user.to_dict()}
