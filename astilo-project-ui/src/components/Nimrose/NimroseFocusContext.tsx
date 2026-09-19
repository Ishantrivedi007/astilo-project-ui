import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const FOCUS_PRESETS = [
  { label: "25 / 5", focusMin: 25, breakMin: 5 },
  { label: "50 / 10", focusMin: 50, breakMin: 10 },
  { label: "90 / 20", focusMin: 90, breakMin: 20 },
];

const SESSIONS_KEY = "nimrose-focus-sessions-completed";
const ACTIVE_TASK_KEY = "nimrose-focus-active-task";

const readCompleted = () => {
  try {
    return Number(localStorage.getItem(SESSIONS_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
};

const readActiveTask = () => {
  try {
    return localStorage.getItem(ACTIVE_TASK_KEY) ?? "";
  } catch {
    return "";
  }
};

interface FocusContextValue {
  presetIndex: number;
  phase: "focus" | "break";
  secondsLeft: number;
  running: boolean;
  completed: number;
  activeTaskTitle: string;
  immersive: boolean;
  applyPreset: (index: number) => void;
  toggleRunning: () => void;
  reset: () => void;
  setActiveTaskTitle: (title: string) => void;
  setImmersive: (value: boolean) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

/** Mounted once at the Nimrose shell level so the focus timer keeps running
 * (and stays in sync) whether the user is looking at the Home widget or the
 * dedicated Focus Mode view — switching sidebar sections doesn't reset it. */
export const NimroseFocusProvider = ({ children }: { children: ReactNode }) => {
  const [presetIndex, setPresetIndex] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_PRESETS[0].focusMin * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(readCompleted);
  const [activeTaskTitle, setActiveTaskTitleState] = useState(readActiveTask);
  const [immersive, setImmersive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        const preset = FOCUS_PRESETS[presetIndex];
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
    setSecondsLeft(FOCUS_PRESETS[index].focusMin * 60);
  };

  const reset = () => {
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(FOCUS_PRESETS[presetIndex].focusMin * 60);
  };

  const setActiveTaskTitle = (title: string) => {
    setActiveTaskTitleState(title);
    try {
      localStorage.setItem(ACTIVE_TASK_KEY, title);
    } catch {
      /* ignore */
    }
  };

  return (
    <FocusContext.Provider
      value={{
        presetIndex,
        phase,
        secondsLeft,
        running,
        completed,
        activeTaskTitle,
        immersive,
        applyPreset,
        toggleRunning: () => setRunning((r) => !r),
        reset,
        setActiveTaskTitle,
        setImmersive,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
};

export const useNimroseFocus = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useNimroseFocus must be used within NimroseFocusProvider");
  return ctx;
};

export const formatFocusTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
