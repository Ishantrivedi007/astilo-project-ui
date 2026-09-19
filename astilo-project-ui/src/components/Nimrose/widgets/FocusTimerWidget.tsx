import { Pause, Play, RotateCcw } from "lucide-react";

import { FOCUS_PRESETS, formatFocusTime, useNimroseFocus } from "../NimroseFocusContext";

const FocusTimerWidget = () => {
  const { presetIndex, phase, secondsLeft, running, completed, applyPreset, toggleRunning, reset } = useNimroseFocus();

  return (
    <div>
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
      <div className="nimrose-focus-display">
        <span className="nimrose-focus-phase">{phase === "focus" ? "Focus" : "Break"}</span>
        <span className="nimrose-focus-time">{formatFocusTime(secondsLeft)}</span>
      </div>
      <div className="nimrose-focus-controls">
        <button type="button" className="nimrose-icon-btn" onClick={toggleRunning}>
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" className="nimrose-icon-btn" onClick={reset} aria-label="Reset">
          <RotateCcw size={16} />
        </button>
        <span className="nimrose-focus-completed">{completed} session{completed === 1 ? "" : "s"} completed</span>
      </div>
    </div>
  );
};

export default FocusTimerWidget;
