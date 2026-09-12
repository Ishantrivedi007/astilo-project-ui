import html
import re

import cherrypy
import requests

from app.config import config
from app.db import get_session
from app.models import LyricsCache

TMDB_BASE = "https://api.themoviedb.org/3"
GENIUS_BASE = "https://api.genius.com"


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


LYRICS_CONTAINER_RE = re.compile(r'<div[^>]*data-lyrics-container="true"[^>]*>(.*?)</div>', re.DOTALL)
HTML_BR_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)
STRIP_TAGS_RE = re.compile(r"<[^>]+>")


def _scrape_genius_lyrics(url: str):
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0 (astilo-project)"})
        if resp.status_code >= 400:
            return None
        blocks = LYRICS_CONTAINER_RE.findall(resp.text)
        if not blocks:
            return None
        lines = []
        for block in blocks:
            block = HTML_BR_RE.sub("\n", block)
            block = STRIP_TAGS_RE.sub("", block)
            block = html.unescape(block)
            # Genius sometimes ships a "N Contributors...Translations..."
            # blurb as its own lyrics-container div with no [Section]
            # marker at all — those carry no actual lyrics, so drop them.
            if not re.search(r"\[[^\]]+\]", block):
                continue
            lines.append(block.strip())
        text = "\n\n".join(line for line in lines if line).strip()
        return text or None
    except requests.RequestException:
        return None


class LyricsSearchController:
    """Searches Genius (cached in `lyrics_cache`) for the Lyrics Search tab.

    Genius gives us proper song thumbnails; the lyrics text itself isn't in
    its API response so we scrape the song page, falling back to lrclib.net
    / lyrics.ovh (no key needed) if the scrape comes up empty or Genius
    isn't configured.
    """

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, action=None, song_id=None):
        if action == "top" or (not q and not song_id):
            with get_session() as session:
                rows = (
                    session.query(LyricsCache)
                    .order_by(LyricsCache.hit_count.desc(), LyricsCache.fetched_at.desc())
                    .limit(24)
                    .all()
                )
                return [r.to_dict() for r in rows]

        if song_id:
            with get_session() as session:
                cached = (
                    session.query(LyricsCache)
                    .filter(LyricsCache.genius_song_id == str(song_id))
                    .first()
                )
                if cached and cached.lyrics_text:
                    cached.hit_count = (cached.hit_count or 0) + 1
                    session.flush()
                    return cached.to_dict()
            raise cherrypy.HTTPError(404, "Song not cached; search first")

        if not q:
            raise cherrypy.HTTPError(400, "q is required")

        if not config.GENIUS_ACCESS_TOKEN:
            return _search_via_lrclib(q)

        try:
            resp = requests.get(
                f"{GENIUS_BASE}/search",
                params={"q": q},
                headers={"Authorization": f"Bearer {config.GENIUS_ACCESS_TOKEN}"},
                timeout=10,
            )
        except requests.RequestException:
            return _search_via_lrclib(q)

        if resp.status_code >= 400:
            return _search_via_lrclib(q)

        hits = resp.json().get("response", {}).get("hits", [])
        results = []
        with get_session() as session:
            for hit in hits[:10]:
                result = hit.get("result", {})
                genius_id = f"genius:{result.get('id')}"
                title = result.get("title")
                artist = (result.get("primary_artist") or {}).get("name")
                thumb = result.get("song_art_image_thumbnail_url") or result.get(
                    "header_image_thumbnail_url"
                )
                url = result.get("url")

                cached = (
                    session.query(LyricsCache)
                    .filter(LyricsCache.genius_song_id == genius_id)
                    .first()
                )
                if cached:
                    cached.hit_count = (cached.hit_count or 0) + 1
                    if thumb and not cached.thumbnail_url:
                        cached.thumbnail_url = thumb
                    results.append(cached.to_dict())
                    continue

                lyrics_text = _scrape_genius_lyrics(url) if url else None
                if not lyrics_text:
                    lrclib = _from_lrclib(artist or "", title or "")
                    lyrics_text = (lrclib or {}).get("plain") or _from_lyrics_ovh(artist or "", title or "")

                entry = LyricsCache(
                    genius_song_id=genius_id,
                    artist=artist,
                    title=title,
                    genius_url=url,
                    thumbnail_url=thumb,
                    lyrics_text=lyrics_text,
                    source="genius",
                    hit_count=1,
                )
                session.add(entry)
                session.flush()
                results.append(entry.to_dict())

        return results


def _search_via_lrclib(q: str):
    """Fallback when Genius is unreachable/unconfigured: lrclib.net search."""
    try:
        resp = requests.get("https://lrclib.net/api/search", params={"q": q}, timeout=10)
    except requests.RequestException as exc:
        raise cherrypy.HTTPError(502, f"Lyrics search failed: {exc}")

    if resp.status_code >= 400:
        raise cherrypy.HTTPError(resp.status_code, "Lyrics search failed")

    hits = resp.json() or []
    results = []
    with get_session() as session:
        for hit in hits[:10]:
            lrclib_id = f"lrclib:{hit.get('id')}"
            title = hit.get("trackName")
            artist = hit.get("artistName")
            synced = hit.get("syncedLyrics") or None
            plain = hit.get("plainLyrics") or (_strip_lrc(synced) if synced else None)

            cached = (
                session.query(LyricsCache)
                .filter(LyricsCache.genius_song_id == lrclib_id)
                .first()
            )
            if cached:
                cached.hit_count = (cached.hit_count or 0) + 1
                results.append(cached.to_dict())
                continue

            if not plain:
                plain = _from_lyrics_ovh(artist or "", title or "")

            entry = LyricsCache(
                genius_song_id=lrclib_id,
                artist=artist,
                title=title,
                genius_url=None,
                thumbnail_url=None,
                lyrics_text=plain,
                source="lrclib",
                hit_count=1,
            )
            session.add(entry)
            session.flush()
            results.append(entry.to_dict())

    return results
