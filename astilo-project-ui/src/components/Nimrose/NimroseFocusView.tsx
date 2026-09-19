import { useQuery } from "@tanstack/react-query";
import { Maximize2, Minimize2, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";

import { fetchNimroseTasks } from "../../lib/nimroseApi";
import { usePlayer } from "../MusicPlayer/PlayerContext";
import { FOCUS_PRESETS, formatFocusTime, useNimroseFocus } from "./NimroseFocusContext";

const NimroseFocusView = () => {
  const {
    presetIndex,
    phase,
    secondsLeft,
    running,
    completed,
    activeTaskTitle,
    immersive,
    applyPreset,
    toggleRunning,
    reset,
    setActiveTaskTitle,
    setImmersive,
  } = useNimroseFocus();

  const { track, isPlaying, togglePlay, next, prev } = usePlayer();

  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "focus-candidates"],
    queryFn: () => fetchNimroseTasks(),
  });
  const openTasks = tasksQuery.data?.filter((t) => t.status !== "completed") ?? [];

  return (
    <div className={`nimrose-focus-mode ${immersive ? "nimrose-focus-mode--immersive" : ""}`}>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Personal</p>
          <h1 className="nimrose-page-title">Focus</h1>
        </div>
        <button type="button" className="nimrose-chip" onClick={() => setImmersive(!immersive)}>
          {immersive ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          {immersive ? "Exit immersive" : "Immersive mode"}
        </button>
      </div>

      <div className="nimrose-focus-mode-card glass-card">
        <div className="nimrose-focus-presets">
          {FOCUS_PRESETS.map((p, i) => (
            <button
              key={p.label}
              type="button"
              className={`nimrose-chip ${i === presetIndex ? "nimrose-chip--active" : ""}`}
              onClick={() => applyPreset(i)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="nimrose-focus-mode-phase">{phase === "focus" ? "Focus" : "Break"}</p>
        <p className="nimrose-focus-mode-time">{formatFocusTime(secondsLeft)}</p>

        <div className="nimrose-focus-mode-controls">
          <button type="button" className="nimrose-icon-btn nimrose-icon-btn--lg" onClick={toggleRunning}>
            {running ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button type="button" className="nimrose-icon-btn" onClick={reset} aria-label="Reset">
            <RotateCcw size={16} />
          </button>
        </div>

        <p className="nimrose-widget-footnote">{completed} session{completed === 1 ? "" : "s"} completed today</p>

        <div className="nimrose-focus-task-picker">
          <label>
            Active task
            <select value={activeTaskTitle} onChange={(e) => setActiveTaskTitle(e.target.value)}>
              <option value="">No task selected</option>
              {openTasks.map((t) => (
                <option key={t.id} value={t.title}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {track && (
          <div className="nimrose-focus-music">
            <img src={track.cover || "/nextuiplayer.jpeg"} alt="" />
            <div className="nimrose-focus-music-info">
              <p>{track.name}</p>
              <span>{track.artist}</span>
            </div>
            <div className="nimrose-music-controls">
              <button type="button" onClick={prev} aria-label="Previous">
                <SkipBack size={14} />
              </button>
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button type="button" onClick={next} aria-label="Next">
                <SkipForward size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NimroseFocusView;
