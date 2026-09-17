import cherrypy

from app.db import get_session
from app.models import Playlist, PlaylistTrack


class PlaylistsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, playlist_id=None, type=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            if playlist_id is None:
                query = session.query(Playlist).filter_by(user_id=user_id)
                if type:
                    query = query.filter_by(type=type)
                return [p.to_dict() for p in query.all()]

            playlist = session.query(Playlist).filter_by(id=int(playlist_id), user_id=user_id).first()
            if not playlist:
                raise cherrypy.HTTPError(404, "Playlist not found")
            return playlist.to_dict(include_tracks=True)

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self, playlist_id=None, action=None):
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}

        with get_session() as session:
            if playlist_id is None:
                name = (body.get("name") or "").strip()
                if not name:
                    raise cherrypy.HTTPError(400, "name is required")
                playlist_type = body.get("type") or "music"
                if playlist_type not in ("music", "movie"):
                    raise cherrypy.HTTPError(400, "type must be music or movie")
                playlist = Playlist(user_id=user_id, name=name, type=playlist_type)
                session.add(playlist)
                session.flush()
                return playlist.to_dict()

            playlist = session.query(Playlist).filter_by(id=int(playlist_id), user_id=user_id).first()
            if not playlist:
                raise cherrypy.HTTPError(404, "Playlist not found")

            if action == "tracks":
                track_id = str(body.get("trackId", ""))
                if not track_id:
                    raise cherrypy.HTTPError(400, "trackId is required")
                media_type = body.get("mediaType") or "track"
                existing = session.query(PlaylistTrack).filter_by(
                    playlist_id=playlist.id, track_id=track_id, media_type=media_type
                ).first()
                if existing:
                    return existing.to_dict()
                track = PlaylistTrack(
                    playlist_id=playlist.id,
                    track_id=track_id,
                    media_type=media_type,
                    title=body.get("title"),
                    artist=body.get("artist"),
                    artwork_url=body.get("artworkUrl"),
                    position=len(playlist.tracks),
                )
                session.add(track)
                session.flush()
                return track.to_dict()

            raise cherrypy.HTTPError(404, "Unknown playlist action")

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, playlist_id):
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        if not name:
            raise cherrypy.HTTPError(400, "name is required")

        with get_session() as session:
            playlist = session.query(Playlist).filter_by(id=int(playlist_id), user_id=user_id).first()
            if not playlist:
                raise cherrypy.HTTPError(404, "Playlist not found")
            playlist.name = name
            session.flush()
            return playlist.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def DELETE(self, playlist_id, track_id=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            playlist = session.query(Playlist).filter_by(id=int(playlist_id), user_id=user_id).first()
            if not playlist:
                raise cherrypy.HTTPError(404, "Playlist not found")

            if track_id is not None:
                track = session.query(PlaylistTrack).filter_by(
                    id=int(track_id), playlist_id=playlist.id
                ).first()
                if not track:
                    raise cherrypy.HTTPError(404, "Track not found")
                session.delete(track)
                return {"deleted": True}

            session.delete(playlist)
            return {"deleted": True}
