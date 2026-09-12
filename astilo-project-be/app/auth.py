import datetime

import bcrypt
import cherrypy
import jwt

from app.config import config


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user) -> str:
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])


def require_auth():
    """CherryPy tool: validates the Authorization: Bearer <token> header
    and stashes the decoded claims on cherrypy.request.user."""
    auth_header = cherrypy.request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise cherrypy.HTTPError(401, "Missing or malformed Authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        claims = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise cherrypy.HTTPError(401, "Token expired")
    except jwt.InvalidTokenError:
        raise cherrypy.HTTPError(401, "Invalid token")

    cherrypy.request.user = claims


def require_admin():
    user = getattr(cherrypy.request, "user", None)
    if not user or user.get("role") != "admin":
        raise cherrypy.HTTPError(403, "Admin access required")


cherrypy.tools.auth = cherrypy.Tool("before_handler", require_auth)
cherrypy.tools.admin_only = cherrypy.Tool("before_handler", require_admin, priority=60)
