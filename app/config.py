import os

from dotenv import load_dotenv

load_dotenv()


def _split_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./astilo.db")
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    CORS_ORIGINS = _split_origins(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", "8080"))

    TMDB_TOKEN = os.getenv("TMDB_TOKEN", "")
    TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
    GENIUS_ACCESS_TOKEN = os.getenv("GENIUS_ACCESS_TOKEN", "")

    # Free signup at https://api.nasa.gov — raises the rate limit from
    # DEMO_KEY's 30/hr, 50/day to 1000/hr. Only needed for APOD/NeoWs/DONKI;
    # the JPL, Exoplanet Archive, and MAST adapters need no key at all.
    NASA_API_KEY = os.getenv("NASA_API_KEY", "DEMO_KEY")

    # Absolute override for where downloaded songs are written (and checked
    # against). Defaults to the sibling astilo-project-ui/public/downloads
    # next to this backend — set this when the frontend being served lives
    # somewhere else (e.g. a separate git worktree).
    MUSIC_DOWNLOADS_DIR = os.getenv("MUSIC_DOWNLOADS_DIR", "")

    # Where Nimrose ticket attachments are stored on disk. Self-contained in
    # the backend (unlike music downloads) since attachments are served
    # directly by this server rather than through the frontend's public/ dir.
    ATTACHMENTS_DIR = os.getenv("ATTACHMENTS_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "attachments"))
    ATTACHMENT_MAX_BYTES = int(os.getenv("ATTACHMENT_MAX_BYTES", str(15 * 1024 * 1024)))  # 15MB


config = Config()
