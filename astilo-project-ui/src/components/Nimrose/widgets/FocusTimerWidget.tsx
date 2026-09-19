import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

const PRESETS = [
  { label: "25 / 5", focusMin: 25, breakMin: 5 },
  { label: "50 / 10", focusMin: 50, breakMin: 10 },
  { label: "90 / 20", focusMin: 90, breakMin: 20 },
];

const SESSIONS_KEY = "nimrose-focus-sessions-completed";

const readCompleted = () => {
  try {
    return Number(localStorage.getItem(SESSIONS_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
};

const format = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const FocusTimerWidget = () => {
  const [presetIndex, setPresetIndex] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].focusMin * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(readCompleted);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Phase finished — flip focus <-> break, counting a completed
        // session each time a focus block runs out.
        const preset = PRESETS[presetIndex];
        if (phase === "focus") {
          setCompleted((c) => {
            const nextCount = c + 1;
            try {
              localStorage.setItem(SESSIONS_KEY, String(nextCount));
            } catch {
              /* ignore */
            }
            return nextCount;
          });
          setPhase("break");
          return preset.breakMin * 60;
        }
        setPhase("focus");
        return preset.focusMin * 60;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, phase, presetIndex]);

  const applyPreset = (index: number) => {
    setPresetIndex(index);
    setPhase("focus");
    setRunning(false);
    setSecondsLeft(PRESETS[index].focusMin * 60);
  };

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(PRESETS[presetIndex].focusMin * 60);
  };

  return (
    <div>
      <div className="nimrose-focus-presets">
        {PRESETS.map((p, i) => (
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
        <span className="nimrose-focus-time">{format(secondsLeft)}</span>
      </div>
      <div className="nimrose-focus-controls">
        <button type="button" className="nimrose-icon-btn" onClick={() => setRunning((r) => !r)}>
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
