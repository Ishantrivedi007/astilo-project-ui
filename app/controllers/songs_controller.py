import json
import os
import re
import uuid

import cherrypy
import requests
import yt_dlp
from mutagen.easyid3 import EasyID3
from mutagen.id3 import APIC, ID3
from mutagen.mp3 import MP3

from app.config import config
from app.db import get_session
from app.models import Song

BE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPO_ROOT = os.path.dirname(BE_DIR)
DOWNLOADS_DIR = config.MUSIC_DOWNLOADS_DIR or os.path.join(
    REPO_ROOT, "astilo-project-ui", "public", "downloads"
)

# Optional local ffmpeg build (see README) — used when ffmpeg isn't on PATH.
FFMPEG_LOCATION = os.path.join(BE_DIR, "tools", "ffmpeg-master-latest-win64-gpl", "bin")
if not os.path.isdir(FFMPEG_LOCATION):
    FFMPEG_LOCATION = None

MP3_BITRATES = (128, 192, 256, 320)
VIDEO_QUALITIES = ("360", "480", "720", "1080", "best")


def _itunes_cover(title: str, artist: str):
    try:
        term = f"{artist} {title}".strip()
        resp = requests.get(
            "https://itunes.apple.com/search",
            params={"term": term, "media": "music", "limit": 1},
            timeout=8,
        )
        if resp.status_code >= 400:
            return None
        results = resp.json().get("results") or []
        if not results:
            return None
        artwork = results[0].get("artworkUrl100")
        return artwork.replace("100x100bb", "600x600bb") if artwork else None
    except requests.RequestException:
        return None


def _download_cover(url: str, dest_path_no_ext: str):
    try:
        resp = requests.get(url, timeout=10)
        if resp.status_code >= 400:
            return None
        path = dest_path_no_ext + ".jpg"
        with open(path, "wb") as f:
            f.write(resp.content)
        return path
    except requests.RequestException:
        return None


def _embed_cover(mp3_path: str, cover_path: str):
    try:
        audio = MP3(mp3_path, ID3=ID3)
        try:
            audio.add_tags()
        except Exception:
            pass
        with open(cover_path, "rb") as img:
            audio.tags.add(APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=img.read()))
        audio.save()
    except Exception:
        pass


class SongSearchController:
    """Lists YouTube candidates for a query without downloading anything."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, q=None, limit=8):
        query = (q or "").strip()
        if not query:
            raise cherrypy.HTTPError(400, "q is required")

        try:
            limit = max(1, min(int(limit), 20))
        except (TypeError, ValueError):
            limit = 8

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
        except Exception as exc:
            raise cherrypy.HTTPError(502, f"Search failed: {exc}")

        entries = (info or {}).get("entries") or []
        results = []
        for e in entries:
            if not e:
                continue
            duration = e.get("duration")
            thumbnails = e.get("thumbnails")
            results.append(
                {
                    "youtubeId": e.get("id"),
                    "title": e.get("title"),
                    "channel": e.get("channel") or e.get("uploader"),
                    "durationSeconds": int(duration) if duration else None,
                    "thumbnailUrl": thumbnails[-1].get("url") if thumbnails else e.get("thumbnail"),
                    "url": e.get("url")
                    or (f"https://www.youtube.com/watch?v={e.get('id')}" if e.get("id") else None),
                }
            )
        return {"results": results, "mp3Bitrates": list(MP3_BITRATES), "videoQualities": list(VIDEO_QUALITIES)}


def _file_exists_for(song: Song) -> bool:
    if not song.audio_url:
        return False
    # audio_url is always "/downloads/<file>" — resolve it against
    # DOWNLOADS_DIR directly rather than assuming the public/ layout.
    filename = song.audio_url.rsplit("/", 1)[-1]
    return os.path.isfile(os.path.join(DOWNLOADS_DIR, filename))


def _delete_files_for(song: Song):
    for url in (song.audio_url, song.cover_url):
        if not url:
            continue
        path = os.path.join(DOWNLOADS_DIR, url.rsplit("/", 1)[-1])
        try:
            if os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass


class SongPreviewController:
    """Resolves a direct, streamable audio URL for a YouTube id — no download,
    no file written to disk. Used so users can audition a search result before
    committing to a download."""

    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, youtubeId=None):
        youtube_id = (youtubeId or "").strip()
        if not youtube_id:
            raise cherrypy.HTTPError(400, "youtubeId is required")

        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "noprogress": True,
            "format": "bestaudio/best",
            "skip_download": True,
        }
        if FFMPEG_LOCATION:
            ydl_opts["ffmpeg_location"] = FFMPEG_LOCATION

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(
                    f"https://www.youtube.com/watch?v={youtube_id}", download=False
                )
        except Exception as exc:
            raise cherrypy.HTTPError(502, f"Preview failed: {exc}")

        stream_url = info.get("url")
        if not stream_url:
            raise cherrypy.HTTPError(502, "No playable audio stream found")

        return {
            "youtubeId": youtube_id,
            "streamUrl": stream_url,
            "durationSeconds": int(info.get("duration") or 0),
        }


class SongsController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, id=None):
        with get_session() as session:
            if id is not None:
                try:
                    song_id = int(id)
                except ValueError:
                    raise cherrypy.HTTPError(400, "id must be a number")
                song = session.get(Song, song_id)
                if not song or not _file_exists_for(song):
                    raise cherrypy.HTTPError(404, "Song not found")
                return song.to_dict()

            songs = session.query(Song).order_by(Song.created_at.desc()).all()
            live, stale = [], []
            for s in songs:
                (live if _file_exists_for(s) else stale).append(s)
            for s in stale:
                session.delete(s)
            if stale:
                session.flush()
            return [s.to_dict() for s in live]

    @cherrypy.tools.json_out()
    def PUT(self, id, **kwargs):
        data = kwargs
        if cherrypy.request.headers.get("Content-Type", "").startswith("application/json"):
            body = cherrypy.request.body.read()
            data = json.loads(body) if body else {}

        try:
            song_id = int(id)
        except ValueError:
            raise cherrypy.HTTPError(400, "id must be a number")

        with get_session() as session:
            song = session.get(Song, song_id)
            if not song:
                raise cherrypy.HTTPError(404, "Song not found")

            title = (data.get("title") or "").strip()
            artist = (data.get("artist") or "").strip()
            if title:
                song.title = title
            if artist:
                song.artist = artist
            session.flush()

            if song.media_type == "audio" and (title or artist) and _file_exists_for(song):
                media_path = os.path.join(DOWNLOADS_DIR, song.audio_url.rsplit("/", 1)[-1])
                try:
                    tags = EasyID3(media_path)
                except Exception:
                    tags = None
                if tags is not None:
                    tags["title"] = song.title
                    tags["artist"] = song.artist or ""
                    tags.save()

            return song.to_dict()

    @cherrypy.tools.json_out()
    def DELETE(self, id):
        try:
            song_id = int(id)
        except ValueError:
            raise cherrypy.HTTPError(400, "id must be a number")

        with get_session() as session:
            song = session.get(Song, song_id)
            if not song:
                raise cherrypy.HTTPError(404, "Song not found")
            _delete_files_for(song)
            session.delete(song)
            return {"deleted": True, "id": song_id}

    @cherrypy.tools.json_out()
    def POST(self, **kwargs):
        data = kwargs
        if cherrypy.request.headers.get("Content-Type", "").startswith("application/json"):
            body = cherrypy.request.body.read()
            data = json.loads(body) if body else {}

        query = (data.get("query") or "").strip()
        youtube_id = (data.get("youtubeId") or "").strip()
        title_hint = (data.get("title") or "").strip() or None
        artist_hint = (data.get("artist") or "").strip() or None

        media_format = (data.get("format") or "mp3").strip().lower()
        if media_format not in ("mp3", "video"):
            raise cherrypy.HTTPError(400, "format must be 'mp3' or 'video'")

        bitrate = data.get("bitrate")
        try:
            bitrate = int(bitrate) if bitrate is not None else 192
        except (TypeError, ValueError):
            raise cherrypy.HTTPError(400, "bitrate must be a number")
        if media_format == "mp3" and bitrate not in MP3_BITRATES:
            raise cherrypy.HTTPError(400, f"bitrate must be one of {MP3_BITRATES}")

        quality = str(data.get("quality") or "best").strip().lower()
        if media_format == "video" and quality not in VIDEO_QUALITIES:
            raise cherrypy.HTTPError(400, f"quality must be one of {VIDEO_QUALITIES}")

        if not query and not youtube_id:
            raise cherrypy.HTTPError(400, "query or youtubeId is required")

        source = f"https://www.youtube.com/watch?v={youtube_id}" if youtube_id else f"ytsearch1:{query}"

        os.makedirs(DOWNLOADS_DIR, exist_ok=True)

        file_id = uuid.uuid4().hex[:12]
        out_template = os.path.join(DOWNLOADS_DIR, f"{file_id}.%(ext)s")

        if media_format == "mp3":
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": out_template,
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "noprogress": True,
                "postprocessors": [
                    {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": str(bitrate)}
                ],
            }
        else:
            height_filter = f"[height<={quality}]" if quality != "best" else ""
            ydl_opts = {
                "format": f"bestvideo{height_filter}+bestaudio/best{height_filter}",
                "outtmpl": out_template,
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "noprogress": True,
                "merge_output_format": "mp4",
            }
        if FFMPEG_LOCATION:
            ydl_opts["ffmpeg_location"] = FFMPEG_LOCATION

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(source, download=True)
                if info.get("entries"):
                    info = info["entries"][0]
        except Exception as exc:
            raise cherrypy.HTTPError(502, f"Download failed: {exc}")

        ext = "mp3" if media_format == "mp3" else "mp4"
        media_path = os.path.join(DOWNLOADS_DIR, f"{file_id}.{ext}")
        if not os.path.exists(media_path):
            raise cherrypy.HTTPError(502, "Conversion failed (is ffmpeg installed?)")

        title = title_hint or info.get("track") or info.get("title") or query or "Unknown title"
        artist = artist_hint or info.get("artist") or info.get("uploader") or "Unknown Artist"
        duration = int(info.get("duration") or 0)
        resolved_youtube_id = info.get("id")
        source_url = info.get("webpage_url")
        thumbnail = info.get("thumbnail")

        cover_url = _itunes_cover(title, artist) or thumbnail
        cover_url_path = None
        if cover_url:
            cover_path = _download_cover(cover_url, os.path.join(DOWNLOADS_DIR, file_id))
            if cover_path:
                cover_url_path = f"/downloads/{os.path.basename(cover_path)}"
                if media_format == "mp3":
                    _embed_cover(media_path, cover_path)

        if media_format == "mp3":
            try:
                tags = EasyID3(media_path)
            except Exception:
                MP3(media_path).add_tags()
                tags = EasyID3(media_path)
            tags["title"] = title
            tags["artist"] = artist
            tags.save()

        with get_session() as session:
            song = Song(
                title=title,
                artist=artist,
                audio_url=f"/downloads/{file_id}.{ext}",
                cover_url=cover_url_path,
                duration_seconds=duration,
                youtube_id=resolved_youtube_id,
                source_url=source_url,
                media_type="audio" if media_format == "mp3" else "video",
                bitrate_kbps=bitrate if media_format == "mp3" else None,
                quality_label=quality if media_format == "video" else None,
            )
            session.add(song)
            session.flush()
            result = song.to_dict()

        return result
