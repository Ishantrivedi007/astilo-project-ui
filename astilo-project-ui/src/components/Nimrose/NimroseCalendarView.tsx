import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { useConfirm } from "../shared";
import {
  createNimroseCalendarEvent,
  deleteNimroseCalendarEvent,
  fetchNimroseCalendarEvents,
  fetchNimroseProjects,
  fetchNimroseTasks,
  type NimroseCalendarEvent,
} from "../../lib/nimroseApi";

const CATEGORIES = ["meeting", "deadline", "personal", "reminder", "other"];

const groupByDay = (events: NimroseCalendarEvent[]) => {
  const groups = new Map<string, NimroseCalendarEvent[]>();
  for (const event of events) {
    const day = event.startAt.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(event);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
};

const NimroseCalendarView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [category, setCategory] = useState("meeting");
  const [relatedTaskId, setRelatedTaskId] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["nimrose", "calendar-events"],
    queryFn: () => fetchNimroseCalendarEvents(),
  });

  const tasksQuery = useQuery({
    queryKey: ["nimrose", "tasks", "all"],
    queryFn: () => fetchNimroseTasks(),
  });

  useQuery({ queryKey: ["nimrose", "projects"], queryFn: fetchNimroseProjects });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["nimrose", "calendar-events"] });

  const createMutation = useMutation({
    mutationFn: createNimroseCalendarEvent,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNimroseCalendarEvent,
    onSuccess: invalidate,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || !startAt) return;
    createMutation.mutate({
      title: trimmed,
      startAt: new Date(startAt).toISOString(),
      category,
      relatedTaskId: relatedTaskId ? Number(relatedTaskId) : undefined,
    });
    setTitle("");
    setStartAt("");
  };

  const events = eventsQuery.data ?? [];
  const grouped = groupByDay(events);

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Calendar</h1>
        </div>
      </div>
      <p className="nimrose-widget-footnote" style={{ marginBottom: "0.75rem" }}>
        Agenda view — day/week/month grids are planned for a later phase.
      </p>

      <form className="nimrose-task-form glass-card" onSubmit={submit}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" aria-label="Event title" />
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          aria-label="Start date/time"
          required
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={relatedTaskId} onChange={(e) => setRelatedTaskId(e.target.value)} aria-label="Related task">
          <option value="">No linked task</option>
          {tasksQuery.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <button type="submit" disabled={createMutation.isPending}>
          <Plus size={14} /> Add
        </button>
      </form>

      {eventsQuery.isLoading && <p className="nimrose-widget-empty">Loading events…</p>}
      {!eventsQuery.isLoading && events.length === 0 && <p className="nimrose-widget-empty">No events yet.</p>}

      {grouped.map(([day, dayEvents]) => (
        <div key={day} className="nimrose-agenda-day">
          <p className="nimrose-agenda-date">
            {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <ul className="nimrose-agenda-list">
            {dayEvents.map((event) => (
              <li key={event.id} className="glass-card nimrose-agenda-item">
                <div className="nimrose-agenda-time">
                  {new Date(event.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="nimrose-agenda-body">
                  <p>{event.title}</p>
                  <div className="nimrose-full-task-meta">
                    {event.category && <span className="nimrose-chip">{event.category}</span>}
                    {event.projectName && <span className="nimrose-chip">{event.projectName}</span>}
                    {event.relatedTaskTitle && <span className="nimrose-chip">↳ {event.relatedTaskTitle}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="nimrose-icon-btn"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete event?",
                      message: `Delete "${event.title}"?`,
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) deleteMutation.mutate(event.id);
                  }}
                  aria-label="Delete event"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default NimroseCalendarView;
