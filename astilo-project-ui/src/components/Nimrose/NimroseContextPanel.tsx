import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Clock, Focus, Play, Plus, Trash2 } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import {
  createContextBubble,
  deleteContextBubble,
  fetchContextBubbles,
  fetchNimroseTasks,
  touchContextBubble,
} from "../../lib/nimroseApi";
import { useNimrosePrompt } from "./NimrosePromptDialog";

const readFocusSessions = () => {
  try {
    return Number(localStorage.getItem("nimrose-focus-sessions-completed") ?? "0") || 0;
  } catch {
    return 0;
  }
};

/** Context Bubbles — temporary self-contained workspace sessions that
 * remember state. A bubble is a snapshot of the current section + query
 * params (project/ticket/sprint/etc, exactly as the URL already encodes
 * them); restoring just navigates there, and NimroseShell's key={viewKey}
 * remount picks up the rest. Local UI state (search text, scroll position)
 * is deliberately not captured. */
const NimroseContextPanel = ({ active }: { active: string }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { prompt } = useNimrosePrompt();
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

  const bubblesQuery = useQuery({ queryKey: ["nimrose", "context-bubbles"], queryFn: fetchContextBubbles });
  const bubbles = bubblesQuery.data ?? [];

  const invalidateBubbles = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "context-bubbles"] });

  const saveMutation = useMutation({ mutationFn: createContextBubble, onSuccess: invalidateBubbles });
  const deleteMutation = useMutation({ mutationFn: deleteContextBubble, onSuccess: invalidateBubbles });
  const touchMutation = useMutation({ mutationFn: touchContextBubble });

  const saveBubble = async () => {
    const name = await prompt({ title: "Save current view", placeholder: "e.g. Q3 launch planning" });
    if (!name?.trim()) return;
    saveMutation.mutate({
      name: name.trim(),
      snapshot: { section: active, params: Object.fromEntries(searchParams) },
    });
  };

  const restoreBubble = (bubble: (typeof bubbles)[number]) => {
    touchMutation.mutate(bubble.id);
    const params = new URLSearchParams(bubble.snapshot.params);
    params.set("section", bubble.snapshot.section);
    navigate(`${AppRoute.nimrose}?${params.toString()}`);
  };

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

      <div className="nimrose-context-bubbles">
        <div className="nimrose-context-bubbles-header">
          <span>Bubbles</span>
          <button type="button" className="nimrose-icon-btn" onClick={saveBubble} aria-label="Save current view as a bubble">
            <Plus size={14} />
          </button>
        </div>
        {bubbles.length === 0 && <p className="nimrose-widget-empty">No saved views yet.</p>}
        <ul className="nimrose-context-bubble-list">
          {bubbles.map((bubble) => (
            <li key={bubble.id} className="nimrose-context-bubble-item">
              <button type="button" className="nimrose-context-bubble-restore" onClick={() => restoreBubble(bubble)}>
                <Play size={11} /> {bubble.name}
              </button>
              <button
                type="button"
                className="nimrose-icon-btn"
                onClick={() => deleteMutation.mutate(bubble.id)}
                aria-label={`Delete bubble ${bubble.name}`}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default NimroseContextPanel;
