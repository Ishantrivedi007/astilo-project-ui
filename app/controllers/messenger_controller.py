import datetime

import cherrypy
from sqlalchemy import func

from app.db import get_session
from app.models import Conversation, ConversationParticipant, DirectMessage, LoginEvent, User


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
        body = cherrypy.request.json or {}
        conversation_id = body.get("conversationId")
        text = (body.get("body") or "").strip()
        if not conversation_id or not text:
            raise cherrypy.HTTPError(400, "conversationId and body are required")

        user_id = _user_id()
        with get_session() as session:
            participant = (
                session.query(ConversationParticipant)
                .filter_by(conversation_id=int(conversation_id), user_id=user_id)
                .first()
            )
            if not participant:
                raise cherrypy.HTTPError(404, "Conversation not found")

            message = DirectMessage(conversation_id=int(conversation_id), sender_id=user_id, body=text)
            session.add(message)
            session.flush()
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
