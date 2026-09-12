import re

import cherrypy
import requests

from app.config import config

TMDB_BASE = "https://api.themoviedb.org/3"


class TmdbController:
    """Proxies TMDB so the browser never sees the API key/token."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, *path_segments, **params):
        if not path_segments:
            raise cherrypy.HTTPError(400, "TMDB path is required")
        if not (config.TMDB_TOKEN or config.TMDB_API_KEY):
            raise cherrypy.HTTPError(503, "TMDB is not configured on the server")

        path = "/".join(path_segments)
        headers = {}
        if config.TMDB_TOKEN:
            headers["Authorization"] = f"Bearer {config.TMDB_TOKEN}"
        else:
            params["api_key"] = config.TMDB_API_KEY

        resp = requests.get(f"{TMDB_BASE}/{path}", params=params, headers=headers, timeout=10)
        if resp.status_code >= 400:
            raise cherrypy.HTTPError(resp.status_code, "TMDB request failed")
        return resp.json()


def _strip_lrc(text: str) -> str:
    text = re.sub(r"\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _from_lrclib(artist: str, title: str):
    try:
        resp = requests.get(
            "https://lrclib.net/api/get",
            params={"artist_name": artist, "track_name": title},
            timeout=8,
        )
        if resp.status_code >= 400:
            return None
        data = resp.json()
        synced = data.get("syncedLyrics") or None
        plain = data.get("plainLyrics") or (_strip_lrc(synced) if synced else "")
        plain = plain.strip()
        if not plain and not synced:
            return None
        return {"plain": plain, "synced": synced}
    except requests.RequestException:
        return None


def _from_lyrics_ovh(artist: str, title: str):
    try:
        resp = requests.get(
            f"https://api.lyrics.ovh/v1/{requests.utils.quote(artist)}/{requests.utils.quote(title)}",
            timeout=8,
        )
        if resp.status_code >= 400:
            return None
        lyrics = resp.json().get("lyrics")
        return lyrics.strip() if lyrics else None
    except requests.RequestException:
        return None


class LyricsController:
    """Looks up plain-text lyrics server-side, falling back across sources."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, artist=None, title=None):
        if not artist or not title:
            raise cherrypy.HTTPError(400, "artist and title are required")

        lrclib = _from_lrclib(artist, title)
        if lrclib:
            return {"lyrics": lrclib["plain"], "synced": lrclib["synced"]}

        ovh = _from_lyrics_ovh(artist, title)
        return {"lyrics": ovh, "synced": None}
