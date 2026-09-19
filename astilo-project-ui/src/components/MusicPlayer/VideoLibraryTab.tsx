import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Slider } from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMusicLibrary, SONGS_QUERY_KEY } from "./useMusicLibrary";
import { DEFAULT_COVER } from "./tracks";
import { useEqualizerChain } from "./EqualizerContext";
import { deleteSong } from "../../lib/musicApi";
import { useConfirm } from "../shared";
import "./MusicPlayer.scss";

const toNumber = (value: number | number[]): number =>
  Array.isArray(value) ? value[0] : value;

const formatTime = (t: number) => {
  const safe = Number.isFinite(t) ? t : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const sliderClassNames = {
  base: "w-full",
  filler: "bg-gradient-to-r from-accent to-accent-2",
  track: "bg-ink/15 border-x-transparent",
  thumb: ["bg-ink shadow-glow", "data-[dragging=true]:scale-125"],
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoLibraryTab = () => {
  const { downloaded } = useMusicLibrary();
  const videos = downloaded.filter((s) => s.mediaType === "video");
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSong(id),
    onSuccess: () => {
      toast.success("Video deleted");
      queryClient.invalidateQueries({ queryKey: SONGS_QUERY_KEY });
    },
    onError: () => toast.error("Couldn't delete that video."),
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [rateOpen, setRateOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEqualizerChain(videoRef, "video");

  const video = videos[Math.min(activeIndex, Math.max(videos.length - 1, 0))];

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeIndex]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isPlaying) el.play().catch(() => setIsPlaying(false));
    else el.pause();
  }, [isPlaying, video]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.volume = muted ? 0 : volume / 100;
  }, [volume, muted]);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.playbackRate = rate;
  }, [rate, video]);

  const next = () => videos.length && setActiveIndex((i) => (i + 1) % videos.length);
  const prev = () => videos.length && setActiveIndex((i) => (i - 1 + videos.length) % videos.length);

  const seek = (t: number) => {
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  if (videos.length === 0) {
    return (
      <div className="neon-card flex flex-col items-center justify-center gap-2 p-12 text-center">
        <p className="font-display text-lg font-extrabold text-ink">No videos yet</p>
        <p className="text-sm text-ink/50">
          Download a video from the Search Song tab (choose "Video (MP4)") to build your library.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="neon-card order-2 flex max-h-[560px] flex-col p-5 lg:order-1">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-ink">Video queue 🎬</h3>
          <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60">
            {videos.length}
          </span>
        </div>
        <ul className="flex-1 space-y-1.5 overflow-y-auto hide-scrollbar">
          {videos.map((v, i) => (
            <li key={v.id}>
              <div
                className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2 transition-all ${
                  activeIndex === i
                    ? "bg-gradient-to-r from-accent/25 to-accent-2/10 ring-1 ring-inset ring-accent/40"
                    : "hover:bg-ink/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <img
                    src={v.coverUrl || DEFAULT_COVER}
                    alt=""
                    className="h-9 w-14 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{v.title}</span>
                    <span className="block truncate text-xs text-ink/50">{v.artist}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete video?",
                      message: `Delete "${v.title}"? This removes the downloaded file too.`,
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate(v.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink/40 opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 disabled:opacity-50"
                  aria-label={`Remove ${v.title} from queue`}
                  title="Delete video"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="neon-card order-1 p-4 lg:order-2">
        <div ref={wrapRef} className="video-stage relative overflow-hidden rounded-3xl bg-black">
          <video
            ref={videoRef}
            src={video.audioUrl}
            poster={video.coverUrl || undefined}
            className="aspect-video w-full bg-black"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={next}
            onClick={() => setIsPlaying((p) => !p)}
          />
          <div className="video-scrim pointer-events-none absolute inset-0" />

          {!isPlaying && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="video-play-orb pointer-events-auto"
                aria-label="Play"
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 6 18 12 9 18z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Slider
            aria-label="Progress"
            classNames={sliderClassNames}
            value={Math.min(currentTime, duration || 1)}
            maxValue={duration || 1}
            onChange={(v) => seek(toNumber(v))}
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-ink/50">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max((duration || 0) - currentTime, 0))}</span>
          </div>
        </div>

        <div className="mt-2 text-center">
          <h3 className="font-display text-xl font-extrabold gradient-text">{video.title}</h3>
          <p className="text-sm text-ink/60">{video.artist}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="ctrl-btn" onClick={prev} aria-label="Previous">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 5.5 8.5 12l9 6.5zM6.5 5.5v13" />
            </svg>
          </button>
          <button
            type="button"
            className="play-orb animate-pulse-glow"
            data-playing={isPlaying}
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <span className="orb-pause">
                <span />
                <span />
              </span>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 6 18 12 9 18z" />
              </svg>
            )}
          </button>
          <button type="button" className="ctrl-btn" onClick={next} aria-label="Next">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 5.5 15.5 12l-9 6.5zM17.5 5.5v13" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ctrl-btn"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted || volume === 0 ? "🔇" : volume > 50 ? "🔊" : "🔉"}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                if (v > 0 && muted) setMuted(false);
              }}
              className="vol-range w-24"
              style={{ "--fill": `${muted ? 0 : volume}%` } as CSSProperties}
              aria-label="Volume"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              className="ctrl-btn px-3 text-xs font-bold"
              onClick={() => setRateOpen((o) => !o)}
            >
              {rate}x
            </button>
            {rateOpen && (
              <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-2xl border border-hair/20 bg-surface p-1.5 shadow-xl">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setRate(s);
                      setRateOpen(false);
                    }}
                    className={`block w-full rounded-xl px-3 py-1 text-left text-xs font-semibold hover:bg-ink/10 ${
                      rate === s ? "text-accent-2" : "text-ink"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="ctrl-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoLibraryTab;
