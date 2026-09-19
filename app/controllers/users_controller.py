import cherrypy

from app.auth import hash_password, verify_password
from app.db import get_session
from app.models import User

VALID_ROLES = {"user", "admin"}
VALID_GENDERS = {"male", "female", "non-binary", "other", "prefer-not-to-say"}
MAX_AVATAR_CHARS = 2_000_000  # ~1.5MB decoded, generous for a resized/compressed photo


class UsersController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, user_id=None, basic=None):
        claims = cherrypy.request.user
        with get_session() as session:
            if user_id is None:
                if basic:
                    # Any authenticated user can see the minimal roster (id/name/email)
                    # for pickers like ticket assignees — no profile/sensitive fields.
                    return [
                        {"id": u.id, "name": u.name, "email": u.email}
                        for u in session.query(User).order_by(User.name.asc()).all()
                    ]
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
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, user_id):
        body = cherrypy.request.json or {}
        claims = cherrypy.request.user

        if user_id == "me":
            return self._update_self(int(claims["sub"]), body)

        if claims.get("role") != "admin":
            raise cherrypy.HTTPError(403, "Admin access required")

        role = body.get("role")
        if role is not None and role not in VALID_ROLES:
            raise cherrypy.HTTPError(400, f"role must be one of {sorted(VALID_ROLES)}")

        with get_session() as session:
            user = session.get(User, int(user_id))
            if not user:
                raise cherrypy.HTTPError(404, "User not found")

            if role and role != "admin" and user.id == int(claims["sub"]):
                raise cherrypy.HTTPError(400, "You can't demote yourself")

            if role:
                user.role = role
            if body.get("name"):
                user.name = body["name"].strip()

            session.flush()
            return user.to_dict()

    def _update_self(self, user_id, body):
        """Profile self-service: personal details, avatar, and an optional
        password change — no role changes allowed on this path."""
        with get_session() as session:
            user = session.get(User, user_id)
            if not user:
                raise cherrypy.HTTPError(404, "User not found")

            if "name" in body:
                name = (body["name"] or "").strip()
                if not name:
                    raise cherrypy.HTTPError(400, "Name can't be empty")
                user.name = name
            if "bio" in body:
                user.bio = (body["bio"] or "").strip() or None
            if "phone" in body:
                user.phone = (body["phone"] or "").strip() or None
            if "location" in body:
                user.location = (body["location"] or "").strip() or None
            if "dateOfBirth" in body:
                user.date_of_birth = (body["dateOfBirth"] or "").strip() or None
            if "gender" in body:
                gender = (body["gender"] or "").strip() or None
                if gender and gender not in VALID_GENDERS:
                    raise cherrypy.HTTPError(400, f"gender must be one of {sorted(VALID_GENDERS)}")
                user.gender = gender
            if "website" in body:
                user.website = (body["website"] or "").strip() or None
            if "avatar" in body:
                avatar = body["avatar"] or None
                if avatar and len(avatar) > MAX_AVATAR_CHARS:
                    raise cherrypy.HTTPError(400, "Photo is too large")
                user.avatar = avatar

            if body.get("newPassword"):
                current = body.get("currentPassword") or ""
                if not verify_password(current, user.password_hash):
                    raise cherrypy.HTTPError(401, "Current password is incorrect")
                if len(body["newPassword"]) < 6:
                    raise cherrypy.HTTPError(400, "New password must be at least 6 characters")
                user.password_hash = hash_password(body["newPassword"])

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
