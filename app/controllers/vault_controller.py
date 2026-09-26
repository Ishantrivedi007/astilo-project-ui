"""Astilo Vault — save anything from anywhere, with its source, metadata,
tags and (lightweight) relationships kept alongside it. Plain CRUD, scoped
to the owning user; no cross-user sharing (unlike Nimrose's project
membership) since a personal save-everything list has no natural "team"."""

import cherrypy

from app.db import get_session
from app.models import VaultItem
from app.notify import notify


def _user_id():
    return int(cherrypy.request.user["sub"])


class VaultController:
    """GET: list the user's saved items (optionally filtered by type, tag,
    source module, or a title/content search). POST: save a new item.
    PUT /<id>: edit one. DELETE /<id>: remove one."""

    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, item_id=None, item_type=None, tag=None, source_module=None, q=None):
        user_id = _user_id()
        with get_session() as session:
            if item_id is not None:
                item = session.query(VaultItem).filter_by(id=int(item_id), user_id=user_id).first()
                if not item:
                    raise cherrypy.HTTPError(404, "Vault item not found")
                return item.to_dict()

            query = session.query(VaultItem).filter_by(user_id=user_id)
            if item_type:
                query = query.filter_by(item_type=item_type)
            if source_module:
                query = query.filter_by(source_module=source_module)
            if q:
                like = f"%{q}%"
                query = query.filter((VaultItem.title.ilike(like)) | (VaultItem.content.ilike(like)))

            items = query.order_by(VaultItem.created_at.desc()).all()
            if tag:
                items = [i for i in items if tag in (i.tags or [])]
            return [i.to_dict() for i in items]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        user_id = _user_id()

        title = (body.get("title") or "").strip()
        if not title:
            raise cherrypy.HTTPError(400, "title is required")

        with get_session() as session:
            item = VaultItem(
                user_id=user_id,
                title=title,
                item_type=body.get("itemType") or "link",
                content=body.get("content"),
                url=body.get("url"),
                thumbnail_url=body.get("thumbnailUrl"),
                source_module=body.get("sourceModule"),
                tags=body.get("tags"),
                metadata_json=body.get("metadata"),
                related_ids=body.get("relatedIds"),
            )
            session.add(item)
            session.flush()
            notify(session, user_id, "vault", f"Saved \"{title}\" to your Vault")
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, item_id):
        body = cherrypy.request.json or {}
        user_id = _user_id()
        with get_session() as session:
            item = session.query(VaultItem).filter_by(id=int(item_id), user_id=user_id).first()
            if not item:
                raise cherrypy.HTTPError(404, "Vault item not found")

            if "title" in body:
                title = (body["title"] or "").strip()
                if not title:
                    raise cherrypy.HTTPError(400, "title can't be empty")
                item.title = title
            if "content" in body:
                item.content = body["content"]
            if "url" in body:
                item.url = body["url"]
            if "thumbnailUrl" in body:
                item.thumbnail_url = body["thumbnailUrl"]
            if "itemType" in body:
                item.item_type = body["itemType"] or "link"
            if "sourceModule" in body:
                item.source_module = body["sourceModule"]
            if "tags" in body:
                item.tags = body["tags"]
            if "metadata" in body:
                item.metadata_json = body["metadata"]
            if "relatedIds" in body:
                item.related_ids = body["relatedIds"]

            session.flush()
            return item.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, item_id):
        user_id = _user_id()
        with get_session() as session:
            item = session.query(VaultItem).filter_by(id=int(item_id), user_id=user_id).first()
            if not item:
                raise cherrypy.HTTPError(404, "Vault item not found")
            session.delete(item)
            return {"deleted": True}
