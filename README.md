# Astilo's

A personal hub app — Movies/TV, Anime, Music, and a small Store — built as a
React + TypeScript frontend backed by a CherryPy API.

```
astilo-project-ui/   Frontend — React, TypeScript, Vite, HeroUI, Tailwind
astilo-project-be/   Backend  — Python, CherryPy, SQLAlchemy
```

Each half is developed on its own branch (`frontend`, `backend`) and merged
here into `main`. If you're working on this repo day-to-day, check out those
branches directly (or as git worktrees, so both are on disk side by side —
see **Development model** below); `main` is the combined snapshot.

## Quick start

**Backend** (`astilo-project-be/`):

```bash
cd astilo-project-be
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env   # fill in TMDB/Genius credentials, JWT secret, etc.
python main.py         # serves on http://localhost:8080
```

**Frontend** (`astilo-project-ui/`):

```bash
cd astilo-project-ui
npm install
cp .env.example .env   # see below
npm run dev             # serves on http://localhost:3000
```

## Environment variables

Neither `.env` file is committed — copy each `.env.example` and fill in your
own values locally.

**Backend** (`astilo-project-be/.env`): database URL, JWT secret, TMDB
token/API key, Genius access token. The backend proxies TMDB so the browser
never sees that key.

**Frontend** (`astilo-project-ui/.env`):
- `VITE_BASE_URL` — the backend API's base URL (defaults to
  `http://localhost:8080/api`).
- `VITE_PROVIDER_*` — base URLs for the Movies/TV/Anime watch page's
  streaming-server switcher (VidSrc, VidLink, 2Embed, SuperEmbed, etc.). Each
  is optional; a provider whose var is unset is simply left out of the
  switcher instead of rendering a broken player. See `src/lib/streams.ts`.

## What's inside

- **Movies & TV** — browse via TMDB, a dedicated watch page (season/episode
  browser, multiple streaming-server options, subtitle/dub language
  selection), reviews & ratings, recommendations.
- **Anime** — same watch experience, sourced from TMDB filtered to
  Japanese-language animation.
- **Music** — player, playlists, lyrics search.
- **Store** — product catalog, cart/checkout, admin management.
- **Auth** — accounts, JWT sessions, an admin role for store/user management.
- **Theming** — 30 curated palettes (15 light / 15 dark), switchable at runtime.

## Development model

This repo is normally worked on as two git worktrees sharing one `.git`,
checked out side by side:

```bash
git clone <repo-url> astilo
cd astilo
git checkout frontend                       # this worktree
git worktree add ../astilo/astilo-project-be backend
```

That gives you `astilo-project-ui/` on the `frontend` branch and
`astilo-project-be/` on the `backend` branch, in the same folder, each
independently committable — which is also why they're separate branches
rather than one shared history. `main` is periodically updated to a snapshot
combining both (this checkout).
