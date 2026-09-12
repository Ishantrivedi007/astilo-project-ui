import cherrypy

from app.db import get_session
from app.models import Favorite, Playlist, PlaylistTrack


def _get_or_create_favorites_playlist(session, user_id):
    playlist = session.query(Playlist).filter_by(user_id=user_id, name="Favorites").first()
    if not playlist:
        playlist = Playlist(user_id=user_id, name="Favorites")
        session.add(playlist)
        session.flush()
    return playlist


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

            if media_type == "track":
                playlist = _get_or_create_favorites_playlist(session, user_id)
                existing_track = session.query(PlaylistTrack).filter_by(
                    playlist_id=playlist.id, track_id=media_id
                ).first()
                if not existing_track:
                    # Favorite has no `artist` field; body may pass one just for mirroring here.
                    track = PlaylistTrack(
                        playlist_id=playlist.id,
                        track_id=media_id,
                        title=body.get("title"),
                        artist=body.get("artist"),
                        artwork_url=body.get("posterUrl"),
                        position=len(playlist.tracks),
                    )
                    session.add(track)
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

            if favorite.media_type == "track":
                playlist = session.query(Playlist).filter_by(user_id=user_id, name="Favorites").first()
                if playlist:
                    track = session.query(PlaylistTrack).filter_by(
                        playlist_id=playlist.id, track_id=favorite.media_id
                    ).first()
                    if track:
                        session.delete(track)

            session.delete(favorite)
            return {"deleted": True}
