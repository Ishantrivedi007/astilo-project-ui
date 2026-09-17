import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { Chip } from "@heroui/react";
import "./Movies.scss";

import { Link } from "react-router-dom";
import { fetchRow, hasTmdb, type MediaItem } from "../../lib/tmdb";
import { MOVIE_ROWS, buildMockRow } from "./catalog";
import MovieRow from "./MovieRow";
import MovieSearchBar from "./MovieSearchBar";
import { useMovieStore } from "./useMovieStore";
import { PageHeading, HeroCarousel } from "../shared";

const MovieHome = () => {
  const { toggleWatchlist, isInWatchlist } = useMovieStore();
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

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <MovieSearchBar />
        <div className="flex flex-wrap gap-2">
          <Link
            to="/movies/watchlist"
            className="rounded-full border border-hair/20 px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            🔖 My watchlist & history
          </Link>
          <Link
            to="/movies/playlists"
            className="rounded-full border border-hair/20 px-4 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            🎞️ My playlists
          </Link>
        </div>
      </div>

      <HeroCarousel
        items={hero}
        basePath="/movies"
        typeLabel={(movie) => (movie.kind === "tv" ? "Series" : "Film")}
        onWatchlist={(movie) => {
          const added = toggleWatchlist(movie);
          toast[added ? "success" : "message"](
            added ? "Added to watchlist" : "Removed from watchlist"
          );
        }}
        autoplayDelay={4500}
      />

      {MOVIE_ROWS.map((row, i) => (
        <MovieRow
          key={row.id}
          id={row.id}
          label={row.label}
          emoji={row.emoji}
          items={results[i]?.data}
          isLoading={results[i]?.isLoading}
          categoryPath="/movies/category"
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={(movie) => {
            const added = toggleWatchlist(movie);
            toast[added ? "success" : "message"](
              added ? "Added to watchlist" : "Removed from watchlist"
            );
          }}
        />
      ))}
    </div>
  );
};

export default MovieHome;
