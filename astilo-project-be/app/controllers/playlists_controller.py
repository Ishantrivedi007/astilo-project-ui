import cherrypy

from app.db import get_session
from app.models import Playlist, PlaylistTrack


class PlaylistsController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, playlist_id=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            if playlist_id is None:
                playlists = session.query(Playlist).filter_by(user_id=user_id).all()
                return [p.to_dict() for p in playlists]

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
                playlist = Playlist(user_id=user_id, name=name)
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
                track = PlaylistTrack(
                    playlist_id=playlist.id,
                    track_id=track_id,
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
