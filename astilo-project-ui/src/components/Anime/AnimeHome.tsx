import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import "./Anime.scss";

import { fetchRow, hasTmdb, type MediaItem } from "../../lib/tmdb";
import { ANIME_ROWS, buildMockAnimeRow } from "./catalog";
import MovieRow from "../Movies/MovieRow";
import MovieSearchBar from "../Movies/MovieSearchBar";
import { useMovieStore } from "../Movies/useMovieStore";
import { PageHeading, HeroCarousel } from "../shared";

type Filter = "all" | "tv" | "movie";

const AnimeHome = () => {
  const { toggleWatchlist, isInWatchlist } = useMovieStore();
  const [filter, setFilter] = useState<Filter>("all");

  const results = useQueries({
    queries: ANIME_ROWS.map((row) => ({
      queryKey: ["tmdb-anime", row.id, hasTmdb],
      staleTime: 1000 * 60 * 10,
      queryFn: async (): Promise<MediaItem[]> => {
        if (!hasTmdb) return buildMockAnimeRow(row.id);
        try {
          const data = await fetchRow(row.endpoint);
          return data.length ? data : buildMockAnimeRow(row.id);
        } catch {
          return buildMockAnimeRow(row.id);
        }
      },
    })),
  });

  const hero = useMemo(() => {
    const trending = results[0]?.data ?? [];
    const withArt = trending.filter((m) => m.backdrop || m.poster).slice(0, 6);
    return withArt.length ? withArt : buildMockAnimeRow("anime-trending").slice(0, 4);
  }, [results]);

  const top10 = useMemo(() => {
    const trending = results[0]?.data ?? [];
    const list = trending.length ? trending : buildMockAnimeRow("anime-trending");
    return list.slice(0, 10);
  }, [results]);

  const visibleRows = ANIME_ROWS.filter((row) => {
    if (filter === "all") return true;
    return (row.endpoint.kind ?? "tv") === filter;
  });

  return (
    <div>
      <PageHeading eyebrow="✦ shonen · seinen · slice-of-life">
        The <span className="gradient-text">anime</span> corner
      </PageHeading>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <MovieSearchBar basePath="/anime" searchPath="/anime/search" />
        <div className="flex flex-wrap gap-2">
          <Link
            to="/anime/watchlist"
            className="rounded-full border border-hair/20 px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            🔖 My watchlist & history
          </Link>
          <Link
            to="/anime/playlists"
            className="rounded-full border border-hair/20 px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            🎞️ My playlists
          </Link>
        </div>
      </div>

      {/* Hero */}
      <HeroCarousel
        items={hero}
        basePath="/anime"
        typeLabel={(item) => (item.kind === "movie" ? "Anime Movie" : "Anime Series")}
        onWatchlist={(item) => {
          const added = toggleWatchlist(item);
          toast[added ? "success" : "message"](
            added ? "Added to watchlist" : "Removed from watchlist"
          );
        }}
        autoplayDelay={4800}
      />

      {/* Filter pills */}
      <div className="mt-8 flex flex-wrap gap-2">
        <button
          className={`pill-filter ${filter === "all" ? "is-active" : ""}`}
          onClick={() => setFilter("all")}
        >
          ✦ Everything
        </button>
        <button
          className={`pill-filter ${filter === "tv" ? "is-active" : ""}`}
          onClick={() => setFilter("tv")}
        >
          📺 Series
        </button>
        <button
          className={`pill-filter ${filter === "movie" ? "is-active" : ""}`}
          onClick={() => setFilter("movie")}
        >
          🎬 Movies
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main rows */}
        <div>
          {visibleRows.map((row) => {
            const idx = ANIME_ROWS.findIndex((r) => r.id === row.id);
            return (
              <MovieRow
                key={row.id}
                id={row.id}
                label={row.label}
                emoji={row.emoji}
                items={results[idx]?.data}
                isLoading={results[idx]?.isLoading}
                basePath="/anime"
                categoryPath="/anime/category"
                isInWatchlist={isInWatchlist}
                onToggleWatchlist={(item) => {
                  const added = toggleWatchlist(item);
                  toast[added ? "success" : "message"](
                    added ? "Added to watchlist" : "Removed from watchlist"
                  );
                }}
              />
            );
          })}
        </div>

        {/* Top 10 ranked sidebar — anikoto-style */}
        <aside className="glass-card h-fit p-4">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">
            🔟 Top 10 this week
          </h2>
          <div className="shimmer-divider mb-3" />
          <div className="flex flex-col">
            {top10.map((item, i) => (
              <Link
                key={`${item.kind}-${item.id}`}
                to={`/anime/${item.kind}/${item.id}`}
                className="rank-row"
              >
                <span className="rank-number">{i + 1}</span>
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-ink/10 text-[10px] text-ink/40">
                      {item.title.slice(0, 2)}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-ink/50">
                    {item.rating > 0 ? `★ ${item.rating.toFixed(1)}` : "—"} ·{" "}
                    {item.kind === "movie" ? "Movie" : "Series"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnimeHome;
