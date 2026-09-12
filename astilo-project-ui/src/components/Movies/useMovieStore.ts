import { useCallback, useSyncExternalStore } from "react";
import type { MediaItem } from "../../lib/tmdb";

/**
 * Tiny localStorage-backed store for the Movies experience:
 * a personal watchlist plus community reviews (comments + ratings).
 * No backend — everything lives in the browser and syncs across tabs.
 */

export interface RecommendedMedia {
  id: number;
  title: string;
  poster: string;
  year: string;
  kind: "movie" | "tv";
}

export interface Review {
  id: string;
  mediaKey: string; // `${kind}-${id}`
  author: string;
  rating: number; // 1..10
  body: string;
  recommends: RecommendedMedia[]; // titles the reviewer also recommends
  createdAt: number;
}

/** Older builds stored recommends as plain strings — normalise on read. */
const migrateReview = (r: Review): Review => ({
  ...r,
  recommends: (r.recommends ?? []).map((x) =>
    typeof x === "string"
      ? { id: 0, title: x, poster: "", year: "", kind: "movie" as const }
      : x
  ),
});

interface WatchItem extends Pick<MediaItem, "id" | "title" | "poster" | "year" | "kind" | "rating"> {
  addedAt: number;
}

interface StoreShape {
  watchlist: WatchItem[];
  reviews: Review[];
}

const KEY = "astilo.movies.v1";
const empty: StoreShape = { watchlist: [], reviews: [] };

const read = (): StoreShape => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = { ...empty, ...JSON.parse(raw) } as StoreShape;
    return { ...parsed, reviews: parsed.reviews.map(migrateReview) };
  } catch {
    return empty;
  }
};

let cache: StoreShape = read();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const write = (next: StoreShape) => {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — keep in-memory */
  }
  emit();
};

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = read();
      emit();
    }
  });
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => cache;

export const mediaKey = (kind: string, id: number | string) => `${kind}-${id}`;

export function useMovieStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggleWatchlist = useCallback((item: MediaItem) => {
    const key = mediaKey(item.kind, item.id);
    const exists = cache.watchlist.some((w) => mediaKey(w.kind, w.id) === key);
    write({
      ...cache,
      watchlist: exists
        ? cache.watchlist.filter((w) => mediaKey(w.kind, w.id) !== key)
        : [
            {
              id: item.id,
              title: item.title,
              poster: item.poster,
              year: item.year,
              kind: item.kind,
              rating: item.rating,
              addedAt: Date.now(),
            },
            ...cache.watchlist,
          ],
    });
    return !exists;
  }, []);

  const isInWatchlist = useCallback(
    (kind: string, id: number | string) =>
      state.watchlist.some((w) => mediaKey(w.kind, w.id) === mediaKey(kind, id)),
    [state.watchlist]
  );

  const addReview = useCallback(
    (r: Omit<Review, "id" | "createdAt">) => {
      write({
        ...cache,
        reviews: [
          { ...r, id: crypto.randomUUID(), createdAt: Date.now() },
          ...cache.reviews,
        ],
      });
    },
    []
  );

  const deleteReview = useCallback((id: string) => {
    write({ ...cache, reviews: cache.reviews.filter((r) => r.id !== id) });
  }, []);

  const reviewsFor = useCallback(
    (key: string) =>
      state.reviews
        .filter((r) => r.mediaKey === key)
        .sort((a, b) => b.createdAt - a.createdAt),
    [state.reviews]
  );

  return {
    watchlist: state.watchlist,
    reviews: state.reviews,
    toggleWatchlist,
    isInWatchlist,
    addReview,
    deleteReview,
    reviewsFor,
  };
}
