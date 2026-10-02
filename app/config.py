import os

from dotenv import load_dotenv

load_dotenv()


def _split_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class Config:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/astilo")
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

    # Optional — a free, instant-signup key from
    # https://www.alphavantage.co/support/#api-key enables a real second
    # data source (redundancy) for equities/indices/bonds/commodities in
    # Markets. Every Alpha Vantage call is a no-op when this is unset, so
    # leaving it empty is a supported, fully working default.
    ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")

    # Optional — a free, instant-signup key from https://twelvedata.com/pricing
    # (basic/free plan). Used only for real historical gold (XAU/USD) data as
    # part of the Markets fallback chain — their free tier gates everything
    # else we tried (indices, silver, NSE stocks) behind a paid plan, so this
    # is intentionally narrow. Empty by default; a no-op when unset.
    TWELVE_DATA_API_KEY = os.getenv("TWELVE_DATA_API_KEY", "")

    # Optional — a free, instant-signup key from
    # https://fred.stlouisfed.org/docs/api/api_key.html. Used for a real
    # forward-looking US economic release calendar (CPI/GDP/jobs/FOMC
    # scheduled dates) — something the World Bank API cannot provide.
    # Empty by default; a no-op when unset.
    FRED_API_KEY = os.getenv("FRED_API_KEY", "")

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

    # The Swagger/OpenAPI docs endpoints (/api/docs, /api/openapi.json) are
    # admin-only regardless, but this is a second, independent kill switch:
    # when false the routes aren't even mounted, so there's nothing to probe
    # or rate-limit in a deployment that doesn't want them reachable at all.
    # Defaults OFF — an explicit opt-in, not an accidentally-exposed default.
    API_DOCS_ENABLED = os.getenv("API_DOCS_ENABLED", "false").strip().lower() in ("1", "true", "yes")

    # Astilo Code's Terminal runs shell commands directly on this host as
    # this process's own user — admin-gated and cwd-restricted, but NOT
    # container/VM isolated (no Docker here per product decision), so an
    # admin account with terminal access can still reach the rest of the
    # host same as any other shell would. Defaults OFF for the same reason
    # API_DOCS_ENABLED does: an explicit opt-in for something this capable,
    # never an accidentally-exposed default.
    CODE_TERMINAL_ENABLED = os.getenv("CODE_TERMINAL_ENABLED", "false").strip().lower() in ("1", "true", "yes")
    CODE_TERMINAL_TIMEOUT_SECONDS = int(os.getenv("CODE_TERMINAL_TIMEOUT_SECONDS", "20"))

    # The one directory Terminal commands run in (cwd) and Code Editor files
    # conceptually live in — created on first use if missing. Kept separate
    # from ATTACHMENTS_DIR and the backend's own source tree.
    CODE_SANDBOX_DIR = os.getenv(
        "CODE_SANDBOX_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "code_sandbox")
    )

    # Astilo Code's Database Explorer connects to whatever connection string
    # an admin supplies at request time — nothing is persisted server-side,
    # so there's no credential store to secure or leak. Defaults OFF, same
    # reasoning as CODE_TERMINAL_ENABLED.
    CODE_DATABASE_ENABLED = os.getenv("CODE_DATABASE_ENABLED", "false").strip().lower() in ("1", "true", "yes")

    # Abyss's license policy: which licenses an external dataset must carry
    # to be ingested at all. CC BY-NC is rejected by default because it rules
    # out any future commercial use of Astilo; flip it on only if that's
    # acceptable for your deployment. This gates GBIF dataset ingestion in
    # particular, since GBIF mixes CC0/CC BY/CC BY-NC per dataset.
    ABYSS_ALLOW_CC0 = os.getenv("ABYSS_ALLOW_CC0", "true").strip().lower() in ("1", "true", "yes")
    ABYSS_ALLOW_CC_BY = os.getenv("ABYSS_ALLOW_CC_BY", "true").strip().lower() in ("1", "true", "yes")
    ABYSS_ALLOW_CC_BY_NC = os.getenv("ABYSS_ALLOW_CC_BY_NC", "false").strip().lower() in ("1", "true", "yes")

    # Global Fishing Watch is excluded from the default build — its standard
    # API terms are free for non-commercial use only, which doesn't fit
    # Astilo's "no paid APIs, no license surprises" rule. Kept as an opt-in
    # developer flag rather than deleted outright.
    ABYSS_FEATURE_GFW = os.getenv("ABYSS_FEATURE_GFW", "false").strip().lower() in ("1", "true", "yes")

    # Nereus (Abyss's contextual AI) runs entirely against a local Ollama
    # instance — no paid LLM API, per the Abyss build rules. Defaults assume
    # Ollama's standard local install; override NEREUS_MODEL to whatever
    # you've actually pulled (`ollama pull <model>`). When Ollama isn't
    # reachable, Nereus degrades to a clear "offline" response rather than
    # fabricating an answer — see app/abyss/nereus.py.
    NEREUS_OLLAMA_BASE_URL = os.getenv("NEREUS_OLLAMA_BASE_URL", "http://localhost:11434")
    NEREUS_MODEL = os.getenv("NEREUS_MODEL", "qwen3:8b")

    # Where Nereus's local RAG index (TF-IDF over real Wikipedia article
    # text — see app/abyss/knowledge_base.py) is persisted to disk, so it
    # survives restarts instead of rebuilding (and re-hitting Wikipedia)
    # every time the server starts.
    ABYSS_KNOWLEDGE_BASE_DIR = os.getenv(
        "ABYSS_KNOWLEDGE_BASE_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "abyss_knowledge_base")
    )

    # Where the real YAMNet SavedModel (Bioacoustic Classifier) is cached
    # after its one-time download — see app/abyss/bioacoustic_classifier.py.
    ABYSS_YAMNET_DIR = os.getenv(
        "ABYSS_YAMNET_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "abyss_yamnet_model")
    )


config = Config()
