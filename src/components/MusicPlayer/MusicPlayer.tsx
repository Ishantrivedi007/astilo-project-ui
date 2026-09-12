import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Slider } from "@heroui/react";
import { toast } from "sonner";
import { DEFAULT_COVER, lengthToSeconds, type Track } from "./tracks";
import "./MusicPlayer.scss";

const svg = {
  prev: "M17.5 5.5 8.5 12l9 6.5zM6.5 5.5v13",
  next: "M6.5 5.5 15.5 12l-9 6.5zM17.5 5.5v13",
  play: "M9 6 18 12 9 18z",
  shuffle:
    "M15 4h5v5M4 20 20 4M15 20h5v-5M14.5 14.5 20 20M4 4l5.5 5.5",
  heart:
    "M12 20.5S3.5 15 3.5 8.8C3.5 6 5.7 4 8.3 4c1.9 0 3.1 1 3.7 2 .6-1 1.8-2 3.7-2 2.6 0 4.8 2 4.8 4.8 0 6.2-8.5 11.7-8.5 11.7z",
};

const Icon = ({
  d,
  fill = false,
  size = 22,
}: {
  d: string;
  fill?: boolean;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
);

const VolumeIcon = ({
  level,
  muted,
  size = 20,
}: {
  level: number;
  muted: boolean;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 9.5v5h3.5L13 18.5v-13L7.5 9.5z" fill="currentColor" stroke="none" />
    <path
      d="M16 9.4a4 4 0 0 1 0 5.2"
      className="vol-wave"
      style={{ opacity: !muted && level > 0.02 ? 1 : 0.18 }}
    />
    <path
      d="M18.7 6.5a8 8 0 0 1 0 11"
      className="vol-wave"
      style={{ opacity: !muted && level > 0.5 ? 1 : 0.18 }}
    />
    {muted && (
      <path d="M3.5 20.5 20.5 3.5" className="vol-strike" stroke="#ef4444" />
    )}
  </svg>
);

const sliderClassNames = {
  base: "w-full",
  filler: "bg-gradient-to-r from-accent to-accent-2",
  track: "bg-ink/15 border-x-transparent",
  thumb: ["bg-ink shadow-glow", "data-[dragging=true]:scale-125"],
};

const toNumber = (value: number | number[]): number =>
  Array.isArray(value) ? value[0] : value;

const formatTime = (t: number) => {
  const safe = Number.isFinite(t) ? t : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

interface MusicPlayerProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayingChange: (playing: boolean) => void;
  onTimeChange: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

const MusicPlayer = ({
  track,
  isPlaying,
  currentTime,
  duration,
  onPlayingChange,
  onTimeChange,
  onDurationChange,
}: MusicPlayerProps) => {
  const isAvailable = Boolean(track.audio);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fallbackTotal = lengthToSeconds(track.length);
  const [volume, setVolume] = useState(65);
  const [muted, setMuted] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const effectiveVolume = muted ? 0 : volume;

  // Seed the timeline for songs without an audio file.
  useEffect(() => {
    if (!isAvailable) onDurationChange(lengthToSeconds(track.length));
  }, [isAvailable, track, onDurationChange]);

  // Real playback for available songs.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => onPlayingChange(false));
    } else {
      el.pause();
    }
  }, [isPlaying, track, onPlayingChange]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = effectiveVolume / 100;
  }, [effectiveVolume, track]);

  // Simulated progress for songs without an audio file.
  useEffect(() => {
    if (isAvailable || !isPlaying) return;
    const id = window.setInterval(() => {
      onTimeChange(currentTime >= duration ? 0 : currentTime + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isAvailable, isPlaying, currentTime, duration, onTimeChange]);

  const total = duration || fallbackTotal || 1;
  const cover = track.cover ?? DEFAULT_COVER;

  const setIsPlaying = (updater: boolean | ((p: boolean) => boolean)) =>
    onPlayingChange(
      typeof updater === "function" ? updater(isPlaying) : updater
    );

  const seek = (value: number) => {
    onTimeChange(value);
    if (isAvailable && audioRef.current) audioRef.current.currentTime = value;
  };

  return (
    <div className="glass-card h-full w-full p-6">
      {isAvailable && (
        <audio
          ref={audioRef}
          src={track.audio}
          preload="metadata"
          onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
          onTimeUpdate={(e) => onTimeChange(e.currentTarget.currentTime)}
          onEnded={() => {
            onPlayingChange(false);
            onTimeChange(0);
          }}
        />
      )}

      <div className="mb-5 flex items-center justify-between">
        <span className="rounded-full bg-ink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">
          {isAvailable ? "Now playing" : "Now vibing"}
        </span>
        <div className="flex items-center gap-3">
          <div className="eq" data-paused={!isPlaying}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <button
            type="button"
            className={`fav-btn ${liked ? "is-fav animate-wiggle" : ""}`}
            onClick={() => {
              setLiked((l) => !l);
              toast(
                liked ? "Removed from favorites" : "Added to favorites 💖"
              );
            }}
            aria-label={liked ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={liked}
          >
            <Icon d={svg.heart} fill={liked} size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative animate-float">
          <span className="album-glow" data-playing={isPlaying} aria-hidden />
          <img
            src={cover}
            alt={`${track.name} — ${track.artist}`}
            className={`relative h-52 w-52 rounded-3xl object-cover shadow-xl ring-2 ring-ink/20 transition-transform ${
              isPlaying ? "scale-100" : "scale-95"
            }`}
          />
        </div>

        <div className="text-center">
          <h3 className="font-display text-2xl font-extrabold gradient-text">
            {track.name}
          </h3>
          <p className="text-sm text-ink/60">{track.artist}</p>
          {!isAvailable && (
            <p className="mt-1 text-[11px] uppercase tracking-widest text-ink/40">
              preview only
            </p>
          )}
        </div>

        <div className="w-full">
          <Slider
            aria-label="Progress"
            classNames={sliderClassNames}
            value={Math.min(currentTime, total)}
            maxValue={total}
            onChange={(v) => seek(toNumber(v))}
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-ink/50">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(Math.max(total - currentTime, 0))}</span>
          </div>
        </div>

        <div className="control-deck">
          <button
            type="button"
            className="ctrl-btn"
            data-active={shuffle}
            onClick={() => setShuffle((s) => !s)}
            aria-label="Shuffle"
            aria-pressed={shuffle}
          >
            <Icon d={svg.shuffle} size={19} />
          </button>

          <div className="deck-center">
            <button type="button" className="ctrl-btn" aria-label="Previous">
              <Icon d={svg.prev} fill />
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
                <Icon d={svg.play} fill size={24} />
              )}
            </button>
            <button type="button" className="ctrl-btn" aria-label="Next">
              <Icon d={svg.next} fill />
            </button>
          </div>

          <span className="deck-spacer" aria-hidden />
        </div>

        <div className="volume-row">
          <button
            type="button"
            className={`ctrl-btn vol-mute ${muted ? "is-muted" : ""}`}
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
          >
            <VolumeIcon level={volume / 100} muted={muted || volume === 0} />
          </button>

          <div className="volume-control" data-open={volOpen}>
            <div className="volume-slider-wrap">
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
                className="vol-range"
                style={{ "--fill": `${muted ? 0 : volume}%` } as CSSProperties}
                aria-label="Volume"
              />
              <span className="volume-readout">{muted ? 0 : volume}</span>
            </div>
            <button
              type="button"
              className="ctrl-btn vol-toggle"
              onClick={() => setVolOpen((o) => !o)}
              aria-label={volOpen ? "Hide volume slider" : "Adjust volume"}
              aria-expanded={volOpen}
            >
              <VolumeIcon level={muted ? 0 : volume / 100} muted={false} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
