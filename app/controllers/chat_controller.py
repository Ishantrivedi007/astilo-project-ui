import datetime

import cherrypy

from app.chatbot import handle_message
from app.db import get_session
from app.models import BOT_NAME, ChatChannel, ChatMessage, User


def _user_id():
    return int(cherrypy.request.user["sub"])


DEFAULT_CHANNELS = ("general", "random")


def _ensure_default_channels(session, user_id: int):
    existing = {c.name for c in session.query(ChatChannel).filter_by(user_id=user_id).all()}
    if existing:
        return
    for name in DEFAULT_CHANNELS:
        session.add(ChatChannel(user_id=user_id, name=name))
    session.flush()


class ChatChannelsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self):
        user_id = _user_id()
        with get_session() as session:
            _ensure_default_channels(session, user_id)
            channels = (
                session.query(ChatChannel)
                .filter_by(user_id=user_id, archived=0)
                .order_by(ChatChannel.created_at.asc())
                .all()
            )
            return [c.to_dict() for c in channels]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip().lstrip("#").lower().replace(" ", "-")
        if not name:
            raise cherrypy.HTTPError(400, "name is required")
        user_id = _user_id()

        with get_session() as session:
            existing = session.query(ChatChannel).filter_by(user_id=user_id, name=name).first()
            if existing:
                raise cherrypy.HTTPError(400, f"#{name} already exists")
            channel = ChatChannel(user_id=user_id, name=name, topic=body.get("topic"))
            session.add(channel)
            session.flush()
            return channel.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, channel_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            channel = session.query(ChatChannel).filter_by(id=int(channel_id), user_id=_user_id()).first()
            if not channel:
                raise cherrypy.HTTPError(404, "Channel not found")
            if "name" in body:
                name = (body["name"] or "").strip().lstrip("#").lower().replace(" ", "-")
                if name:
                    channel.name = name
            if "topic" in body:
                channel.topic = body["topic"] or None
            if "archived" in body:
                channel.archived = 1 if body["archived"] else 0
            session.flush()
            return channel.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, channel_id):
        user_id = _user_id()
        with get_session() as session:
            channel = session.query(ChatChannel).filter_by(id=int(channel_id), user_id=user_id).first()
            if not channel:
                raise cherrypy.HTTPError(404, "Channel not found")
            session.query(ChatMessage).filter_by(channel_id=channel.id).delete()
            session.delete(channel)
            return {"deleted": True}


class ChatMessagesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, channel_id=None, after_id=None, limit=100):
        if not channel_id:
            raise cherrypy.HTTPError(400, "channel_id is required")
        user_id = _user_id()
        with get_session() as session:
            channel = session.query(ChatChannel).filter_by(id=int(channel_id), user_id=user_id).first()
            if not channel:
                raise cherrypy.HTTPError(404, "Channel not found")

            query = session.query(ChatMessage).filter_by(channel_id=channel.id)
            if after_id:
                query = query.filter(ChatMessage.id > int(after_id))
            messages = query.order_by(ChatMessage.created_at.asc()).limit(int(limit)).all()
            return [m.to_dict() for m in messages]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        channel_id = body.get("channelId")
        text = (body.get("body") or "").strip()
        if not channel_id or not text:
            raise cherrypy.HTTPError(400, "channelId and body are required")

        user_id = _user_id()
        with get_session() as session:
            channel = session.query(ChatChannel).filter_by(id=int(channel_id), user_id=user_id).first()
            if not channel:
                raise cherrypy.HTTPError(404, "Channel not found")

            author = session.get(User, user_id)
            author_name = author.name if author else "You"

            message = ChatMessage(channel_id=channel.id, user_id=user_id, author_name=author_name, body=text)
            session.add(message)
            session.flush()

            bot_reply = None
            try:
                bot_reply = handle_message(text)
            except Exception:
                bot_reply = None

            bot_message = None
            if bot_reply:
                bot_message = ChatMessage(
                    channel_id=channel.id, user_id=user_id, author_name=BOT_NAME, is_bot=1, body=bot_reply
                )
                session.add(bot_message)
                session.flush()

            return {
                "message": message.to_dict(),
                "botMessage": bot_message.to_dict() if bot_message else None,
            }

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
            message = (
                session.query(ChatMessage)
                .join(ChatChannel)
                .filter(ChatMessage.id == int(message_id), ChatChannel.user_id == user_id, ChatMessage.is_bot == 0)
                .first()
            )
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
            message = (
                session.query(ChatMessage)
                .join(ChatChannel)
                .filter(ChatMessage.id == int(message_id), ChatChannel.user_id == user_id)
                .first()
            )
            if not message:
                raise cherrypy.HTTPError(404, "Message not found")
            session.delete(message)
            return {"deleted": True}
