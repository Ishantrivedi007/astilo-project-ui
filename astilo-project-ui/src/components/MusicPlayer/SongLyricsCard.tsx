import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { GradientButton } from "../shared";
import { fetchLyricsSynced } from "../../lib/lyrics";
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
  const fallback = track.lyrics ?? GENERIC_FALLBACK;
  const { data, isLoading } = useQuery({
    queryKey: ["lyrics", track.artist, track.name],
    queryFn: () => fetchLyricsSynced(track.artist, track.name, fallback),
    staleTime: Infinity,
  });

  const synced = data?.synced ?? null;

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

  return (
    <div className="glass-card flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold gradient-text">
          Lyrics
        </h3>
        <span className="lyrics-chip">
          <span className="lyrics-chip-dot" aria-hidden />
          <span className="truncate">{track.name}</span>
        </span>
      </div>

      <div
        ref={scrollRef}
        className="lyrics-scroll relative flex-1 overflow-y-auto py-6 text-center text-sm leading-7 text-ink/80 hide-scrollbar"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner color="secondary" label="finding the words…" />
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
          <div className="whitespace-pre-line">{data?.plain}</div>
        )}
      </div>

      <GradientButton fullWidth size="sm" className="mt-3 shrink-0">
        Sing along ✨
      </GradientButton>
    </div>
  );
};

export default SongLyricsCard;
