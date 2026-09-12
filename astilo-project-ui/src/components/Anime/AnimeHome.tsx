import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Chip } from "@heroui/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "./Anime.scss";

import type { MediaItem } from "../../lib/tmdb";
import { fetchAnimeRow } from "../../lib/anime";
import { ANIME_ROWS, buildMockAnimeRow } from "./catalog";
import MovieRow from "../Movies/MovieRow";
import { useMovieStore } from "../Movies/useMovieStore";
import { PageHeading } from "../shared";

type Filter = "all" | "tv" | "movie";

const AnimeHome = () => {
  const { toggleWatchlist } = useMovieStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  const results = useQueries({
    queries: ANIME_ROWS.map((row) => ({
      queryKey: ["jikan-anime", row.id],
      staleTime: 1000 * 60 * 10,
      queryFn: async (): Promise<MediaItem[]> => {
        try {
          const data = await fetchAnimeRow(row.endpoint);
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
    const rowKind = row.endpoint.format === "MOVIE" ? "movie" : "tv";
    return rowKind === filter;
  });

  return (
    <div>
      <PageHeading eyebrow="✦ shonen · seinen · slice-of-life">
        The <span className="gradient-text">anime</span> corner
      </PageHeading>

      {/* Hero */}
      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides
        loop={hero.length > 3}
        slidesPerView="auto"
        spaceBetween={24}
        autoplay={{ delay: 4800, disableOnInteraction: true }}
        coverflowEffect={{ rotate: 22, stretch: 0, depth: 140, modifier: 1, slideShadows: false }}
        pagination={{ clickable: true }}
        modules={[EffectCoverflow, Pagination, Autoplay]}
        className="anime-hero-swiper"
      >
        {hero.map((item) => (
          <SwiperSlide key={`${item.kind}-${item.id}`}>
            <div className="relative h-full overflow-hidden rounded-3xl ring-1 ring-white/10">
              <img
                src={item.backdrop || item.poster}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 text-white">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip className="bg-white/20 text-xs text-white">
                    {item.kind === "movie" ? "Anime Movie" : "Anime Series"}
                  </Chip>
                  {item.year && (
                    <Chip className="bg-white/20 text-xs text-white">{item.year}</Chip>
                  )}
                  {item.rating > 0 && (
                    <Chip className="bg-amber-400/30 text-xs text-white">
                      ★ {item.rating.toFixed(1)}
                    </Chip>
                  )}
                </div>
                <Link
                  to={`/anime/${item.kind}/${item.id}`}
                  className="font-display text-3xl font-extrabold drop-shadow hover:underline"
                >
                  {item.title}
                </Link>
                {item.overview && (
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/80">
                    {item.overview}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    onPress={() => navigate(`/anime/${item.kind}/${item.id}`)}
                    radius="full"
                    className="bg-white font-bold text-black transition-transform hover:scale-105"
                  >
                    ▶ Details
                  </Button>
                  <Button
                    radius="full"
                    variant="bordered"
                    onPress={() => {
                      const added = toggleWatchlist(item);
                      toast[added ? "success" : "message"](
                        added ? "Added to watchlist" : "Removed from watchlist"
                      );
                    }}
                    className="border-white/40 font-semibold text-white"
                  >
                    + Watchlist
                  </Button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

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

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        {/* Main rows */}
        <div>
          {visibleRows.map((row) => {
            const idx = ANIME_ROWS.findIndex((r) => r.id === row.id);
            return (
              <MovieRow
                key={row.id}
                label={row.label}
                emoji={row.emoji}
                items={results[idx]?.data}
                isLoading={results[idx]?.isLoading}
                basePath="/anime"
              />
            );
          })}
        </div>

        {/* Top 10 ranked sidebar — anikoto-style */}
        <aside className="glass-card sticky top-24 h-fit p-4">
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
