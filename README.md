# astilo-project-be

CherryPy API backend for Astilo (movies / anime / music / store hub).

## Setup

```
pip install -r requirements.txt
copy .env.example .env
python main.py
```

Server runs at `http://localhost:8080`. Requires a running Postgres instance
(`DATABASE_URL` in `.env`) — tables and migrations are created automatically
on first run.

## Endpoints

Over 130 endpoints now (Auth, Users, Favorites, Search, Vault, Code,
Store, Media, Music, Cosmos, Markets, Trading, Nimrose, Chat, Messenger,
Library, Research) — this list isn't hand-duplicated here because it
already went stale once. The live, always-accurate source of truth is the
admin Swagger UI:

```
API_DOCS_ENABLED=true   # in .env
```

then visit `http://localhost:8080/api/docs?token=<your admin JWT>` (or
just `/api/docs` if already logged in as admin in the same browser
session — see `app/controllers/docs_controller.py`). The spec itself is
generated in `app/openapi_spec.py` from the real `cherrypy.tree.mount()`
table in `app/server.py`, so it can't drift from what's actually mounted.

All protected routes expect `Authorization: Bearer <token>`.

## Notes

- Runs on Python 3.13+ via the `legacy-cgi` shim (CherryPy 18.x still imports
  the stdlib `cgi` module, which was removed in 3.13).
- Movies/anime/lyrics/music are proxied server-side (TMDB, Jikan-compatible
  anime catalog, Genius/lrclib/lyrics.ovh, yt-dlp) so third-party keys never
  reach the browser — see the `Media`/`Music` tags in the Swagger docs.
- Astilo Code's Terminal and Database Explorer are real, high-risk
  capabilities (real shell execution / arbitrary SQL against a supplied
  connection string) — admin-only and off by default
  (`CODE_TERMINAL_ENABLED` / `CODE_DATABASE_ENABLED` in `.env`), not
  container/VM isolated even when enabled. Leave them off unless actively
  using them.
- Switching to Postgres: set `DATABASE_URL` in `.env` and
  `pip install -r requirements-postgres.txt`.
