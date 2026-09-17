import { useMemo, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Music, Sparkles, ShoppingBag, Palette, Globe, CalendarClock } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import { fetchRow, hasTmdb, type MediaItem } from "../../lib/tmdb";
import { MOVIE_ROWS, buildMockRow } from "../Movies/catalog";
import { useMovieStore, type WatchingEntry } from "../Movies/useMovieStore";
import { GradientButton, Reveal } from "../shared";
import MovieRow from "../Movies/MovieRow";
import "./Home.scss";

const QUICK_ACCESS = [
  { label: "Movies", href: AppRoute.movies, icon: Clapperboard },
  { label: "Music", href: AppRoute.music, icon: Music },
  { label: "Anime", href: AppRoute.anime, icon: Sparkles },
  { label: "Store", href: AppRoute.store, icon: ShoppingBag },
  { label: "Customize", href: AppRoute.customize, icon: Palette },
];

const COMING_SOON = [
  { label: "Browser", icon: Globe },
  { label: "Nimrose Desk", icon: CalendarClock },
];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const watchHref = (entry: WatchingEntry) =>
  entry.kind === "tv"
    ? `${AppRoute.moviesWatch}/${entry.kind}/${entry.id}/${entry.season ?? 1}/${entry.episode ?? 1}`
    : `${AppRoute.moviesWatch}/${entry.kind}/${entry.id}`;

const ContinueWatchingCard = ({ entry }: { entry: WatchingEntry }) => (
  <Link to={watchHref(entry)} className="group block">
    <div className="glass-card relative flex items-center gap-3 overflow-hidden p-2.5 transition-transform duration-300 group-hover:-translate-y-1">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink/10">
        {entry.poster || entry.backdrop ? (
          <img
            src={entry.poster || entry.backdrop}
            alt={entry.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{entry.title}</p>
        <p className="text-xs text-ink/50">
          {entry.kind === "tv" ? `S${entry.season ?? 1} · E${entry.episode ?? 1}` : "Film"}
        </p>
      </div>
    </div>
  </Link>
);

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { watching } = useMovieStore();

  const trendingRow = MOVIE_ROWS[0];
  const { data: trending, isLoading: trendingLoading } = useQuery<MediaItem[]>({
    queryKey: ["tmdb", trendingRow.id, hasTmdb],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      if (!hasTmdb) return buildMockRow(trendingRow.id);
      try {
        const data = await fetchRow(trendingRow.endpoint);
        return data.length ? data : buildMockRow(trendingRow.id);
      } catch {
        return buildMockRow(trendingRow.id);
      }
    },
  });

  const heroBackdrop = useMemo(
    () => trending?.find((m) => m.backdrop)?.backdrop ?? "",
    [trending]
  );

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="home-dashboard">
      <div className="home-grid">
        {/* Greeting hero */}
        <Reveal className="home-hero" style={heroBackdrop ? ({ "--hero-bg": `url(${heroBackdrop})` } as CSSProperties) : undefined}>
          <div className="home-hero-content">
            <p className="home-eyebrow">✦ {greeting().toLowerCase()}</p>
            <h1 className="home-hero-title">
              {greeting()}, <span className="gradient-text">{firstName}</span>
            </h1>
            <p className="home-hero-sub">Your world. Your vibe.</p>
            <GradientButton size="md" onPress={() => navigate(AppRoute.movies)} className="mt-4 w-fit">
              Explore now
            </GradientButton>
          </div>
        </Reveal>

        {/* Continue watching */}
        <Reveal delay={0.1} className="home-panel">
          <h2 className="home-panel-title">Continue watching</h2>
          {watching.length === 0 ? (
            <div className="home-panel-empty-wrap">
              <span className="home-panel-empty-icon">🎬</span>
              <p className="home-panel-empty">
                Nothing yet — <Link to={AppRoute.movies} className="text-accent-2 underline">start watching</Link> and it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div className="home-continue-list">
              {watching.slice(0, 5).map((entry) => (
                <ContinueWatchingCard key={`${entry.kind}-${entry.id}`} entry={entry} />
              ))}
            </div>
          )}
        </Reveal>
      </div>

      {/* Quick access */}
      <section className="home-quick-access">
        {QUICK_ACCESS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.href} index={i}>
              <Link to={item.href} className="home-quick-tile">
                <Icon size={22} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            </Reveal>
          );
        })}
        {COMING_SOON.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.label} index={QUICK_ACCESS.length + i}>
              <div className="home-quick-tile home-quick-tile--disabled" title={`${item.label} — coming soon`}>
                <Icon size={22} strokeWidth={2} />
                <span>{item.label}</span>
              </div>
            </Reveal>
          );
        })}
      </section>

      {/* Trending now */}
      <MovieRow label="Trending now" emoji="🔥" items={trending} isLoading={trendingLoading} />
    </div>
  );
};

export default Home;
