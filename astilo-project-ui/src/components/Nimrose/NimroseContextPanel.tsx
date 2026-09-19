import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Clock, Focus } from "lucide-react";

import { fetchNimroseTasks } from "../../lib/nimroseApi";

const readFocusSessions = () => {
  try {
    return Number(localStorage.getItem("nimrose-focus-sessions-completed") ?? "0") || 0;
  } catch {
    return 0;
  }
};

const NimroseContextPanel = () => {
  const [now, setNow] = useState(() => new Date());
  const [focusSessions, setFocusSessions] = useState(readFocusSessions);

  // Tasks are backend-persisted (see widgets/TasksWidget.tsx) — refetch
  // periodically rather than reading a localStorage snapshot that no
  // longer reflects reality once tasks are shared across devices.
  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "all"],
    queryFn: () => fetchNimroseTasks(),
    refetchInterval: 5000,
  });
  const taskCount = (tasksQuery.data ?? []).filter((t) => t.status !== "completed").length;

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
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
        <span>Nimrose Desk</span>
      </div>
    </aside>
  );
};

export default NimroseContextPanel;
