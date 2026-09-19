import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { AppRoute } from "../../app/AppRoute";
import { usePlayer } from "./PlayerContext";
import { DEFAULT_COVER, lengthToSeconds } from "./tracks";
import "./MiniPlayer.scss";

const formatTime = (t: number) => {
  const safe = Number.isFinite(t) ? t : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const MiniPlayer = () => {
  const navigate = useNavigate();
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    closed,
    onPlayerTab,
    togglePlay,
    next,
    prev,
    seek,
    setVolume,
    setMuted,
    close,
  } = usePlayer();

  const [volOpen, setVolOpen] = useState(false);

  if (!track || closed || onPlayerTab) return null;

  const total = duration || lengthToSeconds(track.length) || 1;
  const progressPct = Math.min(100, (Math.min(currentTime, total) / total) * 100);

  return (
    <div className="mini-player">
      <button
        type="button"
        className="mini-player-track"
        onClick={() => navigate(AppRoute.music)}
        title="Open Music Player"
      >
        <img src={track.cover || DEFAULT_COVER} alt="" />
        <span className="mini-player-meta">
          <span className="mini-player-name">{track.name}</span>
          <span className="mini-player-artist">{track.artist}</span>
        </span>
      </button>

      <div className="mini-player-controls">
        <button type="button" className="mp-btn" onClick={prev} aria-label="Previous">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.5 5.5 8.5 12l9 6.5zM6.5 5.5v13" />
          </svg>
        </button>
        <button
          type="button"
          className="mp-btn mp-play"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 6 18 12 9 18z" />
            </svg>
          )}
        </button>
        <button type="button" className="mp-btn" onClick={next} aria-label="Next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.5 5.5 15.5 12l-9 6.5zM17.5 5.5v13" />
          </svg>
        </button>
      </div>

      <div className="mini-player-volume" data-open={volOpen}>
        <button
          type="button"
          className="mp-btn"
          onClick={() => setVolOpen((o) => !o)}
          aria-label="Volume"
          aria-expanded={volOpen}
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
          className="mp-vol-range"
          style={{ "--fill": `${muted ? 0 : volume}%` } as CSSProperties}
          aria-label="Volume"
        />
      </div>

      <div className="mini-player-scrub">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progressPct}
          onChange={(e) => seek((Number(e.target.value) / 100) * total)}
          className="mp-progress-range"
          style={{ "--fill": `${progressPct}%` } as CSSProperties}
          aria-label="Progress"
        />
      </div>

      <span className="mini-player-time">{formatTime(currentTime)}</span>

      <button
        type="button"
        className="mp-btn mp-close"
        onClick={close}
        aria-label="Close player"
        title="Stop and close"
      >
        ✕
      </button>
    </div>
  );
};

export default MiniPlayer;
