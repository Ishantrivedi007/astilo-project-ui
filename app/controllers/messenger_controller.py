import datetime
import json
import os
import uuid

import cherrypy
import jwt
from sqlalchemy import func

from app.auth import decode_token
from app.config import config
from app.db import get_session
from app.models import Conversation, ConversationParticipant, DirectMessage, LoginEvent, PersonalContact, User
from app.notify import notify

IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"}


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


def _user_id():
    return int(cherrypy.request.user["sub"])


def _other_participants(session, conversation_id: int, exclude_user_id: int):
    rows = (
        session.query(User)
        .join(ConversationParticipant, ConversationParticipant.user_id == User.id)
        .filter(ConversationParticipant.conversation_id == conversation_id, User.id != exclude_user_id)
        .all()
    )
    return rows


def _last_seen(session, user_id: int):
    row = (
        session.query(func.max(LoginEvent.created_at))
        .filter(LoginEvent.user_id == user_id)
        .scalar()
    )
    return row.isoformat() if row else None


class MessengerContactsController:
    """The real Astilo user roster (minus yourself), each with a genuine
    last-seen time computed from their actual login history — not a
    fabricated "online" indicator."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            users = session.query(User).filter(User.id != user_id).order_by(User.name.asc()).all()
            return [
                {"id": u.id, "name": u.name, "email": u.email, "avatar": u.avatar, "lastSeen": _last_seen(session, u.id)}
                for u in users
            ]


class MessengerPersonalContactsController:
    """The user's own added-contacts list — distinct from the full roster
    (MessengerContactsController): find a real Astilo user by email or
    phone (or scan their QR "connect code", which just encodes their
    email), add/remove them, and give them a private nickname."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            # Auto-seed: every other real Astilo user becomes a contact the
            # first time this loads, the same way chat channels auto-seed —
            # so a fresh account isn't stuck manually looking each one up by
            # email/phone before they can message them.
            existing_ids = {
                row.contact_id
                for row in session.query(PersonalContact.contact_id).filter_by(owner_id=user_id).all()
            }
            other_users = session.query(User).filter(User.id != user_id).all()
            for u in other_users:
                if u.id not in existing_ids:
                    session.add(PersonalContact(owner_id=user_id, contact_id=u.id))
            session.flush()

            contacts = (
                session.query(PersonalContact)
                .filter_by(owner_id=user_id)
                .order_by(PersonalContact.created_at.desc())
                .all()
            )
            return [c.to_dict() for c in contacts]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        """Body: {"lookup": "<email or phone or pasted QR code>", "nickname": optional}"""
        body = cherrypy.request.json or {}
        lookup = (body.get("lookup") or "").strip()
        if not lookup:
            raise cherrypy.HTTPError(400, "lookup (email or phone) is required")
        user_id = _user_id()

        # A scanned/pasted QR connect code is just "astilo-connect:<email>".
        if lookup.lower().startswith("astilo-connect:"):
            lookup = lookup.split(":", 1)[1].strip()

        with get_session() as session:
            found = (
                session.query(User)
                .filter((User.email == lookup.lower()) | (User.phone == lookup))
                .first()
            )
            if not found:
                raise cherrypy.HTTPError(404, "No Astilo user found with that email or phone")
            if found.id == user_id:
                raise cherrypy.HTTPError(400, "That's you")

            existing = session.query(PersonalContact).filter_by(owner_id=user_id, contact_id=found.id).first()
            if existing:
                return existing.to_dict()

            contact = PersonalContact(owner_id=user_id, contact_id=found.id, nickname=(body.get("nickname") or "").strip() or None)
            session.add(contact)
            session.flush()
            return contact.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, contact_id):
        body = cherrypy.request.json or {}
        user_id = _user_id()
        with get_session() as session:
            contact = session.query(PersonalContact).filter_by(id=int(contact_id), owner_id=user_id).first()
            if not contact:
                raise cherrypy.HTTPError(404, "Contact not found")
            if "nickname" in body:
                contact.nickname = (body["nickname"] or "").strip() or None
            session.flush()
            return contact.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, contact_id):
        user_id = _user_id()
        with get_session() as session:
            contact = session.query(PersonalContact).filter_by(id=int(contact_id), owner_id=user_id).first()
            if not contact:
                raise cherrypy.HTTPError(404, "Contact not found")
            session.delete(contact)
            return {"deleted": True}


class MessengerConversationsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            conv_ids = [
                cp.conversation_id
                for cp in session.query(ConversationParticipant).filter_by(user_id=user_id).all()
            ]
            results = []
            for cid in conv_ids:
                conv = session.get(Conversation, cid)
                if not conv:
                    continue
                others = _other_participants(session, cid, user_id)
                last_message = (
                    session.query(DirectMessage)
                    .filter_by(conversation_id=cid)
                    .order_by(DirectMessage.created_at.desc())
                    .first()
                )
                unread_count = (
                    session.query(DirectMessage)
                    .filter(
                        DirectMessage.conversation_id == cid,
                        DirectMessage.sender_id != user_id,
                        DirectMessage.read_at.is_(None),
                    )
                    .count()
                )
                results.append(
                    {
                        "id": conv.id,
                        "isGroup": bool(conv.is_group),
                        "name": conv.name or (others[0].name if others else "Conversation"),
                        "participants": [{"id": o.id, "name": o.name, "avatar": o.avatar} for o in others],
                        "lastMessage": last_message.to_dict() if last_message else None,
                        "unreadCount": unread_count,
                        "lastActivityAt": (last_message.created_at if last_message else conv.created_at).isoformat(),
                    }
                )
            results.sort(key=lambda r: r["lastActivityAt"], reverse=True)
            return results

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        """Body: {"userId": N} — finds or creates the 1:1 conversation with
        that user (idempotent, like starting a WhatsApp chat with a
        contact — never duplicates)."""
        body = cherrypy.request.json or {}
        other_id = body.get("userId")
        if not other_id:
            raise cherrypy.HTTPError(400, "userId is required")
        user_id = _user_id()
        if int(other_id) == user_id:
            raise cherrypy.HTTPError(400, "Can't start a conversation with yourself")

        with get_session() as session:
            other = session.get(User, int(other_id))
            if not other:
                raise cherrypy.HTTPError(404, "User not found")

            my_conv_ids = {cp.conversation_id for cp in session.query(ConversationParticipant).filter_by(user_id=user_id).all()}
            their_conv_ids = {cp.conversation_id for cp in session.query(ConversationParticipant).filter_by(user_id=int(other_id)).all()}
            shared = my_conv_ids & their_conv_ids
            for cid in shared:
                conv = session.get(Conversation, cid)
                if conv and not conv.is_group:
                    return {"id": conv.id, "created": False}

            conv = Conversation(is_group=0)
            session.add(conv)
            session.flush()
            session.add(ConversationParticipant(conversation_id=conv.id, user_id=user_id))
            session.add(ConversationParticipant(conversation_id=conv.id, user_id=int(other_id)))
            session.flush()
            return {"id": conv.id, "created": True}


class MessengerMessagesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, conversation_id=None, limit=100):
        if not conversation_id:
            raise cherrypy.HTTPError(400, "conversation_id is required")
        user_id = _user_id()
        with get_session() as session:
            participant = (
                session.query(ConversationParticipant)
                .filter_by(conversation_id=int(conversation_id), user_id=user_id)
                .first()
            )
            if not participant:
                raise cherrypy.HTTPError(404, "Conversation not found")

            messages = (
                session.query(DirectMessage)
                .filter_by(conversation_id=int(conversation_id))
                .order_by(DirectMessage.created_at.asc())
                .limit(int(limit))
                .all()
            )

            # Opening the conversation marks the other side's messages read —
            # real read-receipt semantics, not a fabricated "seen" flag.
            now = datetime.datetime.utcnow()
            changed = False
            for m in messages:
                if m.sender_id != user_id and m.read_at is None:
                    m.read_at = now
                    changed = True
            if changed:
                session.flush()

            return [m.to_dict() for m in messages]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        """Body: {"conversationId", "body", and optionally "kind" ("text" |
        "image" | "file" | "contact"), "attachmentStoredName" (from a prior
        upload to /api/messenger/attachments), "contact" (a shared-contact
        card payload). A plain text message just needs conversationId+body,
        same as before."""
        body = cherrypy.request.json or {}
        conversation_id = body.get("conversationId")
        text = (body.get("body") or "").strip()
        kind = (body.get("kind") or "text").strip()
        contact = body.get("contact")
        stored_name = body.get("attachmentStoredName")

        if not conversation_id:
            raise cherrypy.HTTPError(400, "conversationId is required")
        if kind == "contact" and not contact:
            raise cherrypy.HTTPError(400, "contact is required for a contact-card message")
        if kind in ("image", "file") and not stored_name:
            raise cherrypy.HTTPError(400, "attachmentStoredName is required for an attachment message")
        if kind in ("text", "sticker") and not text:
            raise cherrypy.HTTPError(400, "body is required")

        user_id = _user_id()
        with get_session() as session:
            participant = (
                session.query(ConversationParticipant)
                .filter_by(conversation_id=int(conversation_id), user_id=user_id)
                .first()
            )
            if not participant:
                raise cherrypy.HTTPError(404, "Conversation not found")

            message = DirectMessage(conversation_id=int(conversation_id), sender_id=user_id, body=text, kind=kind)

            if kind in ("image", "file"):
                path = os.path.join(_attachments_dir(), stored_name)
                if not os.path.isfile(path):
                    raise cherrypy.HTTPError(400, "Unknown attachment — upload it first")
                message.attachment_file_name = body.get("attachmentFileName") or stored_name
                message.attachment_stored_name = stored_name
                message.attachment_content_type = body.get("attachmentContentType") or "application/octet-stream"
                message.attachment_size_bytes = body.get("attachmentSizeBytes")

            if kind == "contact":
                message.contact_payload_json = json.dumps(contact)

            session.add(message)
            session.flush()

            sender = session.get(User, user_id)
            other_participants = (
                session.query(ConversationParticipant)
                .filter(
                    ConversationParticipant.conversation_id == int(conversation_id),
                    ConversationParticipant.user_id != user_id,
                )
                .all()
            )
            preview = text if text else {"image": "Sent a photo", "file": "Sent a file", "contact": "Shared a contact"}.get(kind, "New message")
            sender_name = sender.name if sender else "Someone"
            for participant in other_participants:
                notify(session, participant.user_id, "messenger", f"{sender_name} sent you a message", body=preview[:140], link="/messenger")

            return message.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, message_id):
        body = cherrypy.request.json or {}
        text = (body.get("body") or "").strip()
        if not text:
            raise cherrypy.HTTPError(400, "body is required")
        user_id = _user_id()

        with get_session() as session:
            message = session.query(DirectMessage).filter_by(id=int(message_id), sender_id=user_id).first()
            if not message:
                raise cherrypy.HTTPError(404, "Message not found")
            message.body = text
            message.edited_at = datetime.datetime.utcnow()
            session.flush()
            return message.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, message_id):
        user_id = _user_id()
        with get_session() as session:
            message = session.query(DirectMessage).filter_by(id=int(message_id), sender_id=user_id).first()
            if not message:
                raise cherrypy.HTTPError(404, "Message not found")
            session.delete(message)
            return {"deleted": True}


class MessengerAttachmentsController:
    """Uploads a file for an about-to-be-sent message (image, document, or
    any other attachment). The file is stored on disk under a random name
    before the message itself exists — the client uploads first, gets back
    a `storedName`, then POSTs /messenger/messages with kind + that name to
    actually create the message, mirroring the Nimrose ticket-attachment
    two-step flow."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def POST(self, file=None, **_ignored):
        if file is None or not getattr(file, "filename", None):
            raise cherrypy.HTTPError(400, "file is required (multipart/form-data)")

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
                    raise cherrypy.HTTPError(413, f"Attachment too large (max {config.ATTACHMENT_MAX_BYTES // (1024 * 1024)}MB)")
                out.write(chunk)

        return {
            "storedName": stored_name,
            "fileName": file.filename,
            "contentType": content_type,
            "sizeBytes": size,
            "isImage": content_type in IMAGE_CONTENT_TYPES,
        }


class MessengerAttachmentFileController:
    """Serves a message attachment's raw bytes, addressed by message id.
    Like the Nimrose file controller, an <img src>/<a href> can't carry an
    Authorization header, so this also accepts the JWT as a `token` query
    param."""

    exposed = True

    def GET(self, message_id, *_rest, token=None):
        auth_header = cherrypy.request.headers.get("Authorization", "")
        if token:
            user_id = _decode_or_401(token)
        elif auth_header.startswith("Bearer "):
            user_id = _decode_or_401(auth_header.split(" ", 1)[1])
        else:
            raise cherrypy.HTTPError(401, "Missing token")

        with get_session() as session:
            message = (
                session.query(DirectMessage)
                .join(ConversationParticipant, ConversationParticipant.conversation_id == DirectMessage.conversation_id)
                .filter(DirectMessage.id == int(message_id), ConversationParticipant.user_id == user_id)
                .first()
            )
            if not message or not message.attachment_stored_name:
                raise cherrypy.HTTPError(404, "Attachment not found")

            path = os.path.join(_attachments_dir(), message.attachment_stored_name)
            if not os.path.isfile(path):
                raise cherrypy.HTTPError(404, "File missing on disk")

            cherrypy.response.headers["Content-Type"] = message.attachment_content_type or "application/octet-stream"
            cherrypy.response.headers["Content-Disposition"] = f'inline; filename="{message.attachment_file_name}"'
            with open(path, "rb") as f:
                return f.read()
