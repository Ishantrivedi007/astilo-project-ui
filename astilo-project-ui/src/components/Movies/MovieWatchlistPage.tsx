import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { PageHeading, useConfirm } from "../shared";
import { fetchDetail } from "../../lib/tmdbDetail";
import type { MediaItem } from "../../lib/tmdb";
import { useMovieStore, mediaKey } from "./useMovieStore";
import PosterCard from "./PosterCard";
import "./Movies.scss";

interface MovieWatchlistPageProps {
  basePath?: string;
  watchBasePath?: string;
}

const MovieWatchlistPage = ({
  basePath = "/movies",
  watchBasePath = "/movies/watch",
}: MovieWatchlistPageProps) => {
  const { watchlist, watching, toggleWatchlist, isInWatchlist, clearWatchlist, clearWatching } = useMovieStore();
  const confirm = useConfirm();

  const onClearWatchlist = async () => {
    const ok = await confirm({ title: "Clear watchlist?", message: "Remove all saved titles from your watchlist? This can't be undone.", confirmLabel: "Clear", danger: true });
    if (ok) {
      clearWatchlist();
      toast.success("Watchlist cleared");
    }
  };

  const onClearHistory = async () => {
    const ok = await confirm({ title: "Clear watch history?", message: "Clear your \"Continue watching\" history? This can't be undone.", confirmLabel: "Clear", danger: true });
    if (ok) {
      clearWatching();
      toast.success("Watch history cleared");
    }
  };

  // Pull "more like this" for the few most-recently watched titles, then
  // merge/dedupe into a single recommendation rail.
  const seeds = watching.slice(0, 3);
  const recQueries = useQueries({
    queries: seeds.map((s) => ({
      queryKey: ["tmdb-detail", s.kind, s.id],
      staleTime: 1000 * 60 * 10,
      queryFn: () => fetchDetail(s.kind, s.id),
    })),
  });

  const recommendations = useMemo(() => {
    const seen = new Set([
      ...watchlist.map((w) => mediaKey(w.kind, w.id)),
      ...watching.map((w) => mediaKey(w.kind, w.id)),
    ]);
    const out: MediaItem[] = [];
    const pushed = new Set<string>();
    for (const q of recQueries) {
      for (const r of q.data?.recommendations ?? []) {
        const key = mediaKey(r.kind, r.id);
        if (seen.has(key) || pushed.has(key)) continue;
        pushed.add(key);
        out.push(r);
      }
    }
    return out.slice(0, 18);
  }, [recQueries, watchlist, watching]);

  const onToggle = (m: MediaItem) => {
    const added = toggleWatchlist(m);
    toast[added ? "success" : "message"](
      added ? "Added to watchlist" : "Removed from watchlist"
    );
  };

  return (
    <div>
      <PageHeading eyebrow="✦ your library">
        Watchlist & <span className="gradient-text">history</span>
      </PageHeading>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">🔖 My watchlist</h2>
          {watchlist.length > 0 && (
            <button
              type="button"
              onClick={onClearWatchlist}
              className="inline-flex items-center gap-1 rounded-full border border-hair/30 px-3 py-1 text-xs text-ink/60 hover:border-danger/50 hover:text-danger"
            >
              <Trash2 size={11} /> Clear watchlist
            </button>
          )}
        </div>
        {watchlist.length === 0 ? (
          <p className="glass-card p-6 text-sm text-ink/50">
            Nothing saved yet — tap + on any poster to add it here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {watchlist.map((item) => {
              const media: MediaItem = { ...item, backdrop: "", overview: "" };
              return (
                <PosterCard
                  key={`${item.kind}-${item.id}`}
                  item={media}
                  basePath={basePath}
                  className="w-full"
                  saved
                  onToggleWatchlist={() => onToggle(media)}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">🕘 Continue watching</h2>
          {watching.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1 rounded-full border border-hair/30 px-3 py-1 text-xs text-ink/60 hover:border-danger/50 hover:text-danger"
            >
              <Trash2 size={11} /> Clear history
            </button>
          )}
        </div>
        {watching.length === 0 ? (
          <p className="glass-card p-6 text-sm text-ink/50">
            Your watch history will show up here once you start something.
          </p>
        ) : (
          <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 hide-scrollbar">
            {watching.map((w) => (
              <Link
                key={`${w.kind}-${w.id}`}
                to={
                  w.season
                    ? `${watchBasePath}/${w.kind}/${w.id}/${w.season}/${w.episode ?? 1}`
                    : `${watchBasePath}/${w.kind}/${w.id}`
                }
                className="group w-[200px] shrink-0 snap-start"
              >
                <div className="glass-card overflow-hidden">
                  {w.backdrop || w.poster ? (
                    <img
                      src={w.backdrop || w.poster}
                      alt={w.title}
                      loading="lazy"
                      className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid aspect-video w-full place-items-center bg-ink/10 text-xs text-ink/40">
                      {w.title}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-ink">{w.title}</p>
                <p className="text-xs text-ink/50">
                  {w.season ? `S${w.season} · E${w.episode ?? 1}` : w.kind === "tv" ? "Series" : "Film"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-3 font-display text-xl font-bold text-ink">✨ Recommended for you</h2>
        {recommendations.length === 0 ? (
          <p className="glass-card p-6 text-sm text-ink/50">
            Watch a few titles and we'll surface picks based on your taste.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {recommendations.map((item) => (
              <PosterCard
                key={`${item.kind}-${item.id}`}
                item={item}
                basePath={basePath}
                className="w-full"
                saved={isInWatchlist(item.kind, item.id)}
                onToggleWatchlist={onToggle}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MovieWatchlistPage;
