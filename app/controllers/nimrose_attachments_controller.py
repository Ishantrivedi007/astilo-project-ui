import os
import uuid

import cherrypy
import jwt

from app.auth import decode_token
from app.config import config
from app.db import get_session
from app.models import NimroseTicket, NimroseTicketAttachment

IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}


def _user_id():
    return int(cherrypy.request.user["sub"])


def _decode_or_401(token: str) -> int:
    try:
        return int(decode_token(token)["sub"])
    except jwt.ExpiredSignatureError:
        raise cherrypy.HTTPError(401, "Token expired")
    except jwt.InvalidTokenError:
        raise cherrypy.HTTPError(401, "Invalid token")


def _attachments_dir():
    os.makedirs(config.ATTACHMENTS_DIR, exist_ok=True)
    return config.ATTACHMENTS_DIR


class NimroseTicketAttachmentsController:
    """Upload/list/delete a ticket's attachments. Files are stored on disk
    under config.ATTACHMENTS_DIR with a random name (the original filename
    is kept only in the DB record, shown back to the user) so there's no
    path-traversal or filename-collision risk from user-supplied names."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, ticket_id):
        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")
            return [a.to_dict() for a in ticket.attachments]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def POST(self, ticket_id, file=None, **_ignored):
        if file is None or not getattr(file, "filename", None):
            raise cherrypy.HTTPError(400, "file is required (multipart/form-data)")

        with get_session() as session:
            ticket = session.query(NimroseTicket).filter_by(id=int(ticket_id), user_id=_user_id()).first()
            if not ticket:
                raise cherrypy.HTTPError(404, "Ticket not found")

            content_type = (file.content_type.value if file.content_type else None) or "application/octet-stream"
            _, ext = os.path.splitext(file.filename)
            stored_name = f"{uuid.uuid4().hex}{ext[:10]}"
            dest_path = os.path.join(_attachments_dir(), stored_name)

            size = 0
            with open(dest_path, "wb") as out:
                while True:
                    chunk = file.file.read(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > config.ATTACHMENT_MAX_BYTES:
                        out.close()
                        os.remove(dest_path)
                        raise cherrypy.HTTPError(
                            413, f"Attachment too large (max {config.ATTACHMENT_MAX_BYTES // (1024 * 1024)}MB)"
                        )
                    out.write(chunk)

            attachment = NimroseTicketAttachment(
                ticket_id=ticket.id,
                uploaded_by_user_id=_user_id(),
                file_name=file.filename,
                stored_name=stored_name,
                content_type=content_type,
                size_bytes=size,
                is_image=1 if content_type in IMAGE_CONTENT_TYPES else 0,
            )
            session.add(attachment)
            session.flush()
            return attachment.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, ticket_id, attachment_id):
        with get_session() as session:
            attachment = (
                session.query(NimroseTicketAttachment)
                .join(NimroseTicket)
                .filter(
                    NimroseTicketAttachment.id == int(attachment_id),
                    NimroseTicketAttachment.ticket_id == int(ticket_id),
                    NimroseTicket.user_id == _user_id(),
                )
                .first()
            )
            if not attachment:
                raise cherrypy.HTTPError(404, "Attachment not found")

            path = os.path.join(_attachments_dir(), attachment.stored_name)
            if os.path.isfile(path):
                os.remove(path)
            session.delete(attachment)
            return {"deleted": True}


class NimroseTicketAttachmentFileController:
    """Serves an attachment's raw bytes. Separate from the CRUD controller
    above since it returns a file, not JSON, and is addressed by
    attachment id alone (an <img src> / download link can't send the
    ticket id as a separate path segment easily).

    Auth note: like the browser proxy, an <img src>/<a href> can't carry an
    Authorization header, so this accepts the JWT as a `token` query param
    as well as the usual header.
    """

    exposed = True

    def GET(self, attachment_id, *_rest, token=None):
        auth_header = cherrypy.request.headers.get("Authorization", "")
        if token:
            user_id = _decode_or_401(token)
        elif auth_header.startswith("Bearer "):
            user_id = _decode_or_401(auth_header.split(" ", 1)[1])
        else:
            raise cherrypy.HTTPError(401, "Missing token")

        with get_session() as session:
            attachment = (
                session.query(NimroseTicketAttachment)
                .join(NimroseTicket)
                .filter(NimroseTicketAttachment.id == int(attachment_id), NimroseTicket.user_id == user_id)
                .first()
            )
            if not attachment:
                raise cherrypy.HTTPError(404, "Attachment not found")

            path = os.path.join(_attachments_dir(), attachment.stored_name)
            if not os.path.isfile(path):
                raise cherrypy.HTTPError(404, "File missing on disk")

            cherrypy.response.headers["Content-Type"] = attachment.content_type or "application/octet-stream"
            cherrypy.response.headers["Content-Disposition"] = f'inline; filename="{attachment.file_name}"'
            with open(path, "rb") as f:
                return f.read()
