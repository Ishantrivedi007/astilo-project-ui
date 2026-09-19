import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bell, X } from "lucide-react";

import { fetchPulse } from "../../lib/pulseApi";

const DISMISSED_KEY = "nimrose-pulse-dismissed";

const readDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const writeDismissed = (ids: string[]) => {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};

/** Astilo Pulse — Nimrose's notification center. Every item is derived
 * live from real overdue/due-soon tasks, tickets, sprints, and calendar
 * reminders (see nimrose_pulse_controller.py), not stored/fabricated.
 * Dismissal is tracked client-side by the notification's stable id; an
 * item also naturally disappears once it's resolved, since it stops
 * matching the backend query. */
const NimrosePulse = ({ onNavigate }: { onNavigate: (section: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const pulseQuery = useQuery({
    queryKey: ["nimrose", "pulse"],
    queryFn: fetchPulse,
    refetchInterval: 60000,
  });

  const all = pulseQuery.data ?? [];
  const visible = all.filter((n) => !dismissed.includes(n.id));

  // Drop dismissed ids that no longer show up live (the underlying task/
  // ticket/sprint/event was resolved), so this set doesn't grow forever.
  useEffect(() => {
    if (!pulseQuery.data) return;
    const liveIds = new Set(pulseQuery.data.map((n) => n.id));
    setDismissed((prev) => {
      const next = prev.filter((id) => liveIds.has(id));
      if (next.length !== prev.length) writeDismissed(next);
      return next;
    });
  }, [pulseQuery.data]);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = [...prev, id];
      writeDismissed(next);
      return next;
    });
  };

  return (
    <div className="nimrose-pulse">
      <button
        type="button"
        className="nimrose-pulse-bell"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${visible.length ? ` (${visible.length})` : ""}`}
      >
        <Bell size={16} />
        {visible.length > 0 && <span className="nimrose-pulse-badge">{visible.length}</span>}
      </button>

      {open && (
        <div className="nimrose-pulse-panel glass-card">
          <p className="nimrose-modal-section-title">
            <Bell size={13} /> Pulse
          </p>
          {visible.length === 0 ? (
            <p className="nimrose-widget-empty">Nothing needs attention.</p>
          ) : (
            <ul className="nimrose-pulse-list">
              {visible.map((n) => (
                <li key={n.id} className={`nimrose-pulse-item nimrose-pulse-item--${n.severity}`}>
                  <button
                    type="button"
                    className="nimrose-pulse-item-body"
                    onClick={() => {
                      onNavigate(n.section);
                      setOpen(false);
                    }}
                  >
                    {n.severity === "high" && <AlertTriangle size={12} />}
                    <span>
                      <strong>{n.title}</strong>
                      <br />
                      <span className="nimrose-widget-footnote">{n.body}</span>
                    </span>
                  </button>
                  <button type="button" className="nimrose-pulse-dismiss" onClick={() => dismiss(n.id)} aria-label="Dismiss">
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NimrosePulse;
