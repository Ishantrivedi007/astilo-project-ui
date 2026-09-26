# Astilo's UI

React + TypeScript + Vite app using [HeroUI](https://heroui.com/) (the successor to NextUI) for components.

## Stack

- **Vite** (dev server / bundler) — replaces Create React App
- **TypeScript** + React 18
- **HeroUI** (`@heroui/react`) + Tailwind CSS v3
- **Theme system** — 10 curated palettes (5 light / 5 dark) switchable at runtime
  from the navbar 🎨 menu. Tokens live in `src/styles/themes.scss` as
  `[data-theme]` blocks (RGB channel triples); registry + provider in `src/theme/`.
  Choice persists to `localStorage`; a tiny inline script in `index.html` applies
  it before first paint (no flash). Default: **Cosmic**.
- **SCSS** (`sass`) for component styles + the global design system (`src/styles/`)
- **TanStack Query** (`@tanstack/react-query`) — data fetching (lyrics, store, TMDB)
- **ApexCharts** (`react-apexcharts`) — animated, theme-aware dashboard charts
- **TanStack Table** (`@tanstack/react-table`) — sortable/filterable users table
- **sonner** — toasts · **react-countup** — animated stats · **framer-motion** —
  scroll reveals · **@formkit/auto-animate** — list transitions
- Route-level code splitting (`React.lazy`) so ApexCharts/Swiper load per page
- Shared UI kit in `src/components/shared/` (`PageHeading`, `GlassPanel`,
  `GradientButton`, `StatCard`, `Reveal`, `Chart`, `Sparkline`, `BarList`) —
  reused across every page
- React Router v6, MUI (loader), Swiper, axios

## Getting started

```bash
npm install
npm run dev      # start dev server on http://localhost:3000
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Environment

`.env` is **git-ignored** (holds secrets). Copy the template and fill it in:

```bash
cp .env.example .env
```

| Var | Purpose |
| --- | --- |
| `VITE_BASE_URL` | base URL for the shared API request helper (optional) |
| `VITE_TMDB_TOKEN` | TMDB v4 read access token → live Movies catalogue |
| `VITE_TMDB_API_KEY` | TMDB v3 API key (alternative to the token) |

Get a free TMDB credential at <https://www.themoviedb.org/settings/api>. With
neither set, the Movies page renders a built-in demo catalogue. Only
`VITE_`-prefixed vars are exposed to the client, via `import.meta.env`.

## Structure

The app has grown well past the original media-hub scope — this list is
kept short intentionally (module purposes are self-explanatory from their
names + the backend's Swagger docs describe every endpoint they call; see
`astilo-project-be/README.md`).

```
src/
  app/                Routing (AppRoute, AppRoutes, AuthorizedRoute, moduleNav — sidebar config)
  auth/               AuthProvider, login/session handling
  lib/                Typed API clients, one per module (cosmosApi, tradingApi, vaultApi, ...)
  components/
    Admin/            Admin-only user management
    Anime/            Jikan-backed catalogue, watch, watchlist, playlists
    Code/             Astilo Code — Editor, Terminal, Database Explorer, API Studio
    Cosmos/           Astronomy explorer — search, Hubble tab, Deep Space Probes,
                      Orbit Explorer, Satellite Tracker, Space Weather, Reference Library
    Customize/        Sidebar personalization (pinned modules)
    DashBoard/        Tremor dashboard + chart data
    Home/             Landing dashboard after login
    Library/          Project Gutenberg / Open Library reader
    Login/            Auth screens
    Markets/          Live quotes, watchlists, macro/economic calendars, Trading
    Messenger/        1:1 direct messages
    Movies/ Anime/    Swiper coverflow galleries, TMDB/Jikan-backed
    MusicPlayer/      Player, playlist, lyrics, yt-dlp downloads
    Nimrose/          Project management — Kanban, sprints, notes, chat, embedded browser
    Notifications/    Cross-module notification feed + activity timeline
    Office/           Notes/Sheets/Slides/Code editor suite
    Research/         Deterministic Wikipedia/NASA research briefs (no LLM)
    Search/           Universal Search (Ctrl/Cmd+K)
    SharedComponents/ Sidebar, TopBar, Loader, shared layout
    Store/            Product grid, cart, wishlist, compare, price history
    Vault/            Save-anything-from-anywhere personal list
    shared/           Reusable UI kit (PageHeading, GlassPanel, Chart, Reveal, ...)
```
