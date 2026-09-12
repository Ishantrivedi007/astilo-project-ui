import cherrypy

from app.db import get_session
from app.models import Favorite


class FavoritesController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, media_type=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            query = session.query(Favorite).filter_by(user_id=user_id)
            if media_type:
                query = query.filter_by(media_type=media_type)
            return [f.to_dict() for f in query.order_by(Favorite.created_at.desc()).all()]

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}
        media_type = body.get("mediaType")
        media_id = str(body.get("mediaId", ""))

        if media_type not in ("movie", "anime", "track") or not media_id:
            raise cherrypy.HTTPError(400, "mediaType (movie|anime|track) and mediaId are required")

        with get_session() as session:
            existing = session.query(Favorite).filter_by(
                user_id=user_id, media_type=media_type, media_id=media_id
            ).first()
            if existing:
                return existing.to_dict()

            favorite = Favorite(
                user_id=user_id,
                media_type=media_type,
                media_id=media_id,
                title=body.get("title"),
                poster_url=body.get("posterUrl"),
            )
            session.add(favorite)
            session.flush()
            return favorite.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, favorite_id):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            favorite = session.query(Favorite).filter_by(id=int(favorite_id), user_id=user_id).first()
            if not favorite:
                raise cherrypy.HTTPError(404, "Favorite not found")
            session.delete(favorite)
            return {"deleted": True}
