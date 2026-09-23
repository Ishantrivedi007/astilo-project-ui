import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading } from "../shared";
import { discoverMedia, EXTRA_ADMIN_GENRE_ID } from "../../lib/tmdb";
import { useMovieStore } from "./useMovieStore";
import PosterCard from "./PosterCard";
import MovieFilterBar, { type FilterState } from "./MovieFilterBar";
import "./Movies.scss";

interface MovieSearchProps {
  basePath?: string;
}

const MovieSearch = ({ basePath = "/movies" }: MovieSearchProps) => {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [queryInput, setQueryInput] = useState(q);
  const [filters, setFilters] = useState<FilterState>({ kind: "movie" });
  const [page, setPage] = useState(1);
  const { toggleWatchlist, isInWatchlist } = useMovieStore();

  // Keep the input in sync if the URL's ?q= changes from elsewhere (e.g. the
  // home page search bar), without fighting the user's own typing.
  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  // Commit the input to the URL (and therefore to the query) as the user
  // types/clears it, instead of only on Enter — clearing the box must
  // actually clear the search, not leave the last query stuck in place.
  useEffect(() => {
    const t = setTimeout(() => {
      const v = queryInput.trim();
      if (v !== q) setParams(v ? { q: v } : {}, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  useEffect(() => {
    setPage(1);
  }, [q, filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["tmdb-search-page", q, filters, page],
    queryFn: () =>
      discoverMedia({
        kind: filters.kind,
        query: q,
        genreId: filters.genreId === EXTRA_ADMIN_GENRE_ID ? undefined : filters.genreId,
        year: filters.year,
        language: filters.language,
        country: filters.country,
        watchProviderId: filters.watchProviderId,
        certification: filters.certification,
        isAdult: filters.genreId === EXTRA_ADMIN_GENRE_ID,
        page,
      }),
    placeholderData: (prev) => prev,
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <div>
      <PageHeading eyebrow="✦ search">
        {q ? (
          <>
            Results for <span className="gradient-text">“{q}”</span>
          </>
        ) : (
          <>
            Browse by <span className="gradient-text">filters</span>
          </>
        )}
      </PageHeading>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = queryInput.trim();
                setParams(v ? { q: v } : {}, { replace: true });
              }
            }}
            placeholder="Refine search, or leave blank to just browse filters…"
            className="w-72 rounded-full border border-hair/20 bg-surface/60 px-4 py-2 pr-8 text-sm text-ink outline-none focus:border-accent"
          />
          {queryInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQueryInput("");
                setParams({}, { replace: true });
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        <MovieFilterBar value={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <AppLoader label="searching…" />
        </div>
      ) : items.length === 0 ? (
        <p className="glass-card p-10 text-center text-sm text-ink/50">
          No titles matched your search{q ? ` for "${q}"` : ""}. Try adjusting the filters.
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

export default MovieSearch;
