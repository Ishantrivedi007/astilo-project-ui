import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { AppInput, GradientButton } from "../shared";
import { fetchLyricsSynced, parseLrc } from "../../lib/lyrics";
import { searchLyrics, type LyricsHit } from "../../lib/geniusApi";
import { updateSong } from "../../lib/musicApi";
import { SONGS_QUERY_KEY } from "./useMusicLibrary";
import type { Track } from "./tracks";
import "./MusicPlayer.scss";

const GENERIC_FALLBACK = `Lyrics for this track aren't available yet.
Hit play and let the melody carry you ✨`;

interface SongLyricsCardProps {
  track: Track;
  currentTime: number;
  isPlaying: boolean;
}

const SongLyricsCard = ({ track, currentTime }: SongLyricsCardProps) => {
  const queryClient = useQueryClient();
  const fallback = track.lyrics ?? GENERIC_FALLBACK;

  // A lyrics search already synced to this song's DB record wins over a live lookup.
  const savedSynced = track.syncedLyrics ? parseLrc(track.syncedLyrics) : null;
  const hasSaved = Boolean(track.syncedLyrics || track.lyrics);

  const { data, isLoading } = useQuery({
    queryKey: ["lyrics", track.artist, track.name],
    queryFn: () => fetchLyricsSynced(track.artist, track.name, fallback),
    staleTime: Infinity,
    enabled: !hasSaved,
  });

  const synced = savedSynced?.length ? savedSynced : data?.synced ?? null;
  const plain = hasSaved ? track.lyrics ?? fallback : data?.plain ?? fallback;
  const notFound = !hasSaved && !isLoading && !synced && plain === GENERIC_FALLBACK;

  const activeIdx = useMemo(() => {
    if (!synced) return -1;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (currentTime + 0.15 >= synced[i].time) idx = i;
      else break;
    }
    return idx;
  }, [synced, currentTime]);

  const lineProgress = useMemo(() => {
    if (!synced || activeIdx < 0) return 0;
    const cur = synced[activeIdx];
    const next = synced[activeIdx + 1];
    const span = next ? next.time - cur.time : 4;
    return Math.min(Math.max((currentTime - cur.time) / span, 0), 1);
  }, [synced, activeIdx, currentTime]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const c = scrollRef.current;
    const el = activeRef.current;
    if (!c || !el) return;
    c.scrollTo({
      top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2,
      behavior: "smooth",
    });
  }, [activeIdx]);

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  useEffect(() => {
    if (!searching) {
      setQuery("");
      setSubmitted("");
    }
  }, [searching]);

  const searchResults = useQuery({
    queryKey: ["lyrics-sync-search", submitted],
    queryFn: () => searchLyrics(submitted),
    enabled: submitted.length > 0,
  });

  const syncMutation = useMutation({
    mutationFn: (hit: LyricsHit) =>
      updateSong(track.songId as number, { lyrics: hit.lyricsText ?? "" }),
    onSuccess: () => {
      toast.success("Lyrics synced to this song");
      queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
      setSearching(false);
    },
    onError: () => toast.error("Couldn't sync those lyrics."),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  return (
    <div className="neon-card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold gradient-text">
          Lyrics
        </h3>
        <span className="lyrics-chip">
          <span className="lyrics-chip-dot" aria-hidden />
          <span className="truncate">{track.name}</span>
        </span>
      </div>

      {searching ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <AppInput
              value={query}
              onValueChange={setQuery}
              placeholder="Search title or artist…"
              size="sm"
              className="flex-1"
            />
            <GradientButton type="submit" size="sm" radius="full" isDisabled={!query.trim()}>
              Search
            </GradientButton>
          </form>

          <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto hide-scrollbar">
            {searchResults.isFetching && (
              <div className="flex justify-center py-6">
                <AppLoader size="sm" />
              </div>
            )}
            {!searchResults.isFetching && submitted && (searchResults.data ?? []).length === 0 && (
              <p className="py-4 text-center text-xs text-ink/50">No matches found.</p>
            )}
            {(searchResults.data ?? []).map((hit) => (
              <button
                key={hit.id}
                type="button"
                disabled={!hit.lyricsText || syncMutation.isPending}
                onClick={() => syncMutation.mutate(hit)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{hit.title}</p>
                  <p className="truncate text-xs text-ink/50">{hit.artist}</p>
                </div>
                {!hit.lyricsText && (
                  <span className="shrink-0 text-[10px] text-ink/40">no lyrics</span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSearching(false)}
            className="mt-3 shrink-0 text-xs font-semibold text-ink/50 hover:text-ink/80"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="lyrics-scroll relative flex-1 overflow-y-auto py-6 text-center text-sm leading-7 text-ink/80 hide-scrollbar"
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <AppLoader label="finding the words…" />
              </div>
            ) : synced ? (
              <div className="flex flex-col gap-1">
                {synced.map((line, i) => {
                  const state =
                    i === activeIdx ? "active" : i < activeIdx ? "done" : "todo";
                  return (
                    <p
                      key={`${line.time}-${i}`}
                      ref={i === activeIdx ? activeRef : undefined}
                      className={`lyric-line ${state}`}
                      style={
                        state === "active"
                          ? ({ "--p": `${lineProgress * 100}%` } as CSSProperties)
                          : undefined
                      }
                    >
                      {line.text || "♪"}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="whitespace-pre-line">{plain}</div>
            )}

            {notFound && track.songId != null && (
              <button
                type="button"
                onClick={() => setSearching(true)}
                className="mt-4 rounded-full bg-ink/10 px-4 py-2 text-xs font-bold text-ink hover:bg-ink/15"
              >
                🔍 Search &amp; sync lyrics
              </button>
            )}
          </div>

          <GradientButton fullWidth size="sm" className="mt-3 shrink-0">
            Sing along ✨
          </GradientButton>
        </>
      )}
    </div>
  );
};

export default SongLyricsCard;
