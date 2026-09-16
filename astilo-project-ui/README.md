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

```
src/
  app/                Routing (AppRoute, AppRoutes, AuthorizedRoute)
  components/
    DashBoard/        Tremor dashboard + chart data
    Login/
    Movies/           Swiper coverflow gallery
    MusicPlayer/      Player, playlist, lyrics
    Navbar/           AcmeLogo
    SharedComponents/ NavBar, SharedButton, Loader, config, SharedApiRequest
    Store/            Product grid
```
