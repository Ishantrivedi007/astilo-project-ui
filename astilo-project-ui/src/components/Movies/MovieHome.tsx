import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Chip } from "@heroui/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "./Movies.scss";

import { fetchRow, hasTmdb, type MediaItem } from "../../lib/tmdb";
import { MOVIE_ROWS, buildMockRow } from "./catalog";
import MovieRow from "./MovieRow";
import { useMovieStore } from "./useMovieStore";
import { PageHeading } from "../shared";

const MovieHome = () => {
  const { toggleWatchlist } = useMovieStore();
  const navigate = useNavigate();
  const results = useQueries({
    queries: MOVIE_ROWS.map((row) => ({
      queryKey: ["tmdb", row.id, hasTmdb],
      staleTime: 1000 * 60 * 10,
      queryFn: async (): Promise<MediaItem[]> => {
        if (!hasTmdb) return buildMockRow(row.id);
        try {
          const data = await fetchRow(row.endpoint);
          return data.length ? data : buildMockRow(row.id);
        } catch {
          return buildMockRow(row.id);
        }
      },
    })),
  });

  const hero = useMemo(() => {
    const trending = results[0]?.data ?? [];
    const withArt = trending.filter((m) => m.backdrop || m.poster).slice(0, 6);
    return withArt.length ? withArt : buildMockRow("popular").slice(0, 4);
  }, [results]);

  return (
    <div>
      <PageHeading
        eyebrow="✦ tonight's picks"
        action={
          !hasTmdb ? (
            <Chip variant="flat" className="bg-ink/10 text-ink/70">
              demo catalogue · add a TMDB key for live data
            </Chip>
          ) : undefined
        }
      >
        Big <span className="gradient-text">screen</span> energy
      </PageHeading>

      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides
        loop={hero.length > 3}
        slidesPerView="auto"
        spaceBetween={24}
        autoplay={{ delay: 4500, disableOnInteraction: true }}
        coverflowEffect={{
          rotate: 22,
          stretch: 0,
          depth: 130,
          modifier: 1,
          slideShadows: false,
        }}
        pagination={{ clickable: true }}
        modules={[EffectCoverflow, Pagination, Autoplay]}
        className="featured-swiper"
      >
        {hero.map((movie) => (
          <SwiperSlide key={`${movie.kind}-${movie.id}`} className="featured-slide">
            <div className="relative h-full overflow-hidden rounded-3xl ring-1 ring-white/10">
              <img
                src={movie.backdrop || movie.poster}
                alt={movie.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="relative flex h-full flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 text-white">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Chip className="bg-white/20 text-xs text-white">
                    {movie.kind === "tv" ? "Series" : "Film"}
                  </Chip>
                  {movie.year && (
                    <Chip className="bg-white/20 text-xs text-white">
                      {movie.year}
                    </Chip>
                  )}
                  {movie.rating > 0 && (
                    <Chip className="bg-amber-400/30 text-xs text-white">
                      ★ {movie.rating.toFixed(1)}
                    </Chip>
                  )}
                </div>
                <Link
                  to={`/movies/${movie.kind}/${movie.id}`}
                  className="font-display text-3xl font-extrabold drop-shadow hover:underline"
                >
                  {movie.title}
                </Link>
                {movie.overview && (
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/80">
                    {movie.overview}
                  </p>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    onPress={() =>
                      navigate(`/movies/${movie.kind}/${movie.id}`)
                    }
                    radius="full"
                    className="bg-white font-bold text-black transition-transform hover:scale-105"
                  >
                    ▶ Details
                  </Button>
                  <Button
                    radius="full"
                    variant="bordered"
                    onPress={() => {
                      const added = toggleWatchlist(movie);
                      toast[added ? "success" : "message"](
                        added
                          ? "Added to watchlist"
                          : "Removed from watchlist"
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

      {MOVIE_ROWS.map((row, i) => (
        <MovieRow
          key={row.id}
          label={row.label}
          emoji={row.emoji}
          items={results[i]?.data}
          isLoading={results[i]?.isLoading}
        />
      ))}
    </div>
  );
};

export default MovieHome;
