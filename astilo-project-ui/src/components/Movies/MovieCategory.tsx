import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { fetchRowPage, filterByCertification, type MediaItem, type TmdbEndpoint } from "../../lib/tmdb";
import { MOVIE_ROWS, buildMockRow } from "./catalog";
import { useMovieStore } from "./useMovieStore";
import PosterCard from "./PosterCard";
import MovieFilterBar, { type FilterState } from "./MovieFilterBar";
import "./Movies.scss";

export interface CategoryRowDef {
  id: string;
  label: string;
  emoji: string;
  endpoint: TmdbEndpoint;
}

interface MovieCategoryProps {
  basePath?: string;
  rows?: CategoryRowDef[];
  mockBuilder?: (rowId: string) => MediaItem[];
  backLabel?: string;
}

/** "View more" page for a single home-page row, with pagination and optional extra filters.
 * Shared by Movies and Anime — pass `rows`/`basePath` to point it at either catalog. */
const MovieCategory = ({
  basePath = "/movies",
  rows = MOVIE_ROWS,
  mockBuilder = buildMockRow,
  backLabel = "movies",
}: MovieCategoryProps) => {
  const { id = "" } = useParams<{ id: string }>();
  const row = rows.find((r) => r.id === id);
  const [page, setPage] = useState(1);
  const [extra, setExtra] = useState<FilterState>({ kind: row?.endpoint.kind ?? "movie" });
  const { toggleWatchlist, isInWatchlist } = useMovieStore();

  useEffect(() => {
    setPage(1);
  }, [id, extra]);

  // Rows with no fixed kind (currently just "Trending now", which mixes
  // movies and TV) get a movie/series switch like the search page; rows
  // scoped to one kind already (Popular movies, Anime, …) keep it fixed.
  const mixedKind = !!row && row.endpoint.kind === undefined;
  const effectiveKind = mixedKind ? extra.kind : row?.endpoint.kind ?? "movie";

  const endpoint: TmdbEndpoint | undefined = row
    ? {
        ...row.endpoint,
        path: mixedKind ? row.endpoint.path.replace("/all/", `/${extra.kind}/`) : row.endpoint.path,
        kind: effectiveKind,
        params: {
          ...row.endpoint.params,
          ...(extra.genreId ? { with_genres: extra.genreId } : {}),
          ...(extra.year
            ? {
                [effectiveKind === "tv" ? "first_air_date_year" : "primary_release_year"]: extra.year,
              }
            : {}),
          ...(extra.language ? { with_original_language: extra.language } : {}),
          ...(extra.country ? { with_origin_country: extra.country } : {}),
          ...(extra.watchProviderId
            ? { with_watch_providers: extra.watchProviderId, watch_region: "US" }
            : {}),
          // /discover/movie supports certification server-side; TV has no
          // such param, so a TV certification filter is applied after the
          // fetch below instead.
          ...(extra.certification && effectiveKind !== "tv"
            ? { certification_country: "US", certification: extra.certification }
            : {}),
        },
      }
    : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tmdb-category-page", id, extra, page],
    enabled: !!endpoint,
    queryFn: async () => {
      const result = await fetchRowPage(endpoint!, page);
      if (extra.certification && effectiveKind === "tv") {
        return { ...result, items: await filterByCertification("tv", result.items, extra.certification) };
      }
      return result;
    },
    placeholderData: (prev) => prev,
  });

  const items = useMemo(
    () => (data?.items?.length ? data.items : page === 1 ? mockBuilder(id) : []),
    [data, id, page, mockBuilder]
  );

  if (!row) {
    return (
      <div className="py-24 text-center">
        <p className="text-ink/60">Unknown category.</p>
        <Link to={basePath} className="mt-3 inline-block text-accent-2 underline">
          ← Back to {backLabel}
        </Link>
      </div>
    );
  }

  const canDiscover = row.endpoint.path.startsWith("/discover") || row.endpoint.path.startsWith("/trending");

  return (
    <div>
      <Link
        to={basePath}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink"
      >
        ← Back to {backLabel}
      </Link>
      <PageHeading eyebrow="✦ view more">
        {row.emoji} {row.label}
      </PageHeading>

      {canDiscover && (
        <div className="mb-6">
          <MovieFilterBar value={extra} onChange={setExtra} showKindToggle={mixedKind} />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="loading…" />
        </div>
      ) : items.length === 0 ? (
        <p className="glass-card p-10 text-center text-sm text-ink/50">
          Nothing to show here right now.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => (
              <PosterCard
                key={`${item.kind}-${item.id}`}
                item={item}
                basePath={basePath}
                className="w-full"
                saved={isInWatchlist(item.kind, item.id)}
                onToggleWatchlist={(m) => {
                  const added = toggleWatchlist(m);
                  toast[added ? "success" : "message"](
                    added ? "Added to watchlist" : "Removed from watchlist"
                  );
                }}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-full border border-hair/20 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-xs text-ink/50">
              Page {data?.page ?? 1} of {Math.max(1, data?.totalPages ?? 1)}
              {isFetching && " · loading…"}
            </span>
            <button
              type="button"
              disabled={!data || page >= (data.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-hair/20 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MovieCategory;
