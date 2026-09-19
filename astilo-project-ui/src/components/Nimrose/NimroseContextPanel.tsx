import { useEffect, useState } from "react";
import { CheckSquare, Clock, Focus } from "lucide-react";

interface LocalTask {
  id: string;
  done: boolean;
}

const readTaskCount = () => {
  try {
    const raw = localStorage.getItem("nimrose-quick-tasks-v1");
    const tasks = raw ? (JSON.parse(raw) as LocalTask[]) : [];
    return tasks.filter((t) => !t.done).length;
  } catch {
    return 0;
  }
};

const readFocusSessions = () => {
  try {
    return Number(localStorage.getItem("nimrose-focus-sessions-completed") ?? "0") || 0;
  } catch {
    return 0;
  }
};

const NimroseContextPanel = () => {
  const [now, setNow] = useState(() => new Date());
  const [taskCount, setTaskCount] = useState(readTaskCount);
  const [focusSessions, setFocusSessions] = useState(readFocusSessions);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setTaskCount(readTaskCount());
      setFocusSessions(readFocusSessions());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="nimrose-context-panel">
      <p className="nimrose-context-time">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
      <p className="nimrose-context-date">{now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>

      <div className="nimrose-context-stat">
        <CheckSquare size={14} />
        <span>{taskCount} task{taskCount === 1 ? "" : "s"} remaining</span>
      </div>
      <div className="nimrose-context-stat">
        <Focus size={14} />
        <span>{focusSessions} focus session{focusSessions === 1 ? "" : "s"} today</span>
      </div>
      <div className="nimrose-context-stat">
        <Clock size={14} />
        <span>Nimrose Desk — Phase 1</span>
      </div>
    </aside>
  );
};

export default NimroseContextPanel;
