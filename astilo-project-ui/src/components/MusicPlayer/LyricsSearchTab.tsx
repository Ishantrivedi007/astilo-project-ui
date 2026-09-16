import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppInput, GradientButton } from "../shared";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { fetchTopLyrics, searchLyrics, type LyricsHit } from "../../lib/geniusApi";
import { DEFAULT_COVER } from "./tracks";

const LyricsSearchTab = () => {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [expanded, setExpanded] = useState<LyricsHit | null>(null);

  const { data: top = [], isLoading: topLoading } = useQuery({
    queryKey: ["lyrics-top"],
    queryFn: fetchTopLyrics,
    staleTime: 30_000,
  });

  const {
    data: results,
    isFetching: searching,
    isError,
  } = useQuery({
    queryKey: ["lyrics-search", submitted],
    queryFn: () => searchLyrics(submitted),
    enabled: submitted.length > 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSubmitted(query.trim());
    setExpanded(null);
  };

  const grid = submitted ? results ?? [] : top;
  const isLoading = submitted ? searching : topLoading;

  return (
    <div>
      <div className="glass-card mb-6 p-6">
        <h3 className="font-display text-lg font-extrabold text-ink">
          Search lyrics
        </h3>
        <p className="mt-1 text-sm text-ink/60">
          Look up any song by title or artist — powered by Genius.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <AppInput
            value={query}
            onValueChange={setQuery}
            placeholder="e.g. Someone Like You Adele"
            className="flex-1"
          />
          <GradientButton type="submit" radius="full" isDisabled={!query.trim()}>
            Search
          </GradientButton>
        </form>
      </div>

      {!submitted && (
        <h4 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-ink/50">
          Top / Trending
        </h4>
      )}

      {isError && (
        <p className="mb-4 text-sm text-ink/60">
          Couldn't find lyrics for that search — try a different title or artist.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <AppLoader label="finding lyrics…" />
        </div>
      )}

      {!isLoading && grid.length === 0 && (
        <p className="glass-card p-6 text-sm text-ink/50">
          {submitted
            ? "No results found."
            : "Nothing cached yet — search a song to build the trending list."}
        </p>
      )}

      {!isLoading && grid.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {grid.map((hit) => (
            <button
              key={hit.id}
              type="button"
              onClick={() => setExpanded(hit)}
              className="glass-card flex flex-col items-center gap-2 p-3 text-center transition-transform hover:scale-[1.03]"
            >
              <img
                src={hit.thumbnailUrl || DEFAULT_COVER}
                alt={hit.title || "cover"}
                className="h-24 w-24 rounded-2xl object-cover shadow-lg"
              />
              <span className="line-clamp-2 text-xs font-bold text-ink">
                {hit.title}
              </span>
              <span className="line-clamp-1 text-[11px] text-ink/50">
                {hit.artist}
              </span>
            </button>
          ))}
        </div>
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setExpanded(null)}
        >
          <div
            className="glass-card max-h-[80vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-4">
              <img
                src={expanded.thumbnailUrl || DEFAULT_COVER}
                alt={expanded.title || "cover"}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-display text-lg font-extrabold gradient-text">
                  {expanded.title}
                </h4>
                <p className="truncate text-sm text-ink/60">{expanded.artist}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(null)}
                className="shrink-0 rounded-full bg-ink/10 px-3 py-1 text-xs font-bold text-ink hover:bg-ink/15"
              >
                Close
              </button>
            </div>
            <div className="whitespace-pre-line text-sm leading-7 text-ink/80">
              {expanded.lyricsText || "Lyrics unavailable for this song."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsSearchTab;
