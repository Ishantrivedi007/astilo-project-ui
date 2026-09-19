import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

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
type ViewMode = "agenda" | "week" | "month";

const groupByDay = (events: NimroseCalendarEvent[]) => {
  const groups = new Map<string, NimroseCalendarEvent[]>();
  for (const event of events) {
    const day = event.startAt.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(event);
  }
  return groups;
};

const toDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfWeek = (d: Date) => {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const NimroseCalendarView = () => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [category, setCategory] = useState("meeting");
  const [relatedTaskId, setRelatedTaskId] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [cursor, setCursor] = useState(() => new Date());

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

  const removeEvent = async (event: NimroseCalendarEvent) => {
    const ok = await confirm({ title: "Delete event?", message: `Delete "${event.title}"?`, confirmLabel: "Delete", danger: true });
    if (ok) deleteMutation.mutate(event.id);
  };

  const events = eventsQuery.data ?? [];
  const eventsByDay = useMemo(() => groupByDay(events), [events]);
  const grouped = useMemo(() => [...eventsByDay.entries()].sort(([a], [b]) => a.localeCompare(b)), [eventsByDay]);

  const monthGrid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const shiftCursor = (amount: number) => {
    const next = new Date(cursor);
    if (viewMode === "month") next.setMonth(next.getMonth() + amount);
    else next.setDate(next.getDate() + amount * 7);
    setCursor(next);
  };

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Calendar</h1>
        </div>
        <div className="nimrose-status-tabs" style={{ marginBottom: 0 }}>
          {(["agenda", "week", "month"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`nimrose-chip ${viewMode === v ? "nimrose-chip--active" : ""}`}
              onClick={() => setViewMode(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

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

      {viewMode === "agenda" && (
        <>
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
                    <button type="button" className="nimrose-icon-btn" onClick={() => removeEvent(event)} aria-label="Delete event">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {viewMode !== "agenda" && (
        <div className="nimrose-cal-nav">
          <button type="button" className="nimrose-icon-btn" onClick={() => shiftCursor(-1)} aria-label="Previous">
            <ChevronLeft size={15} />
          </button>
          <span className="nimrose-cal-nav-label">
            {viewMode === "month"
              ? cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })
              : `Week of ${startOfWeek(cursor).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </span>
          <button type="button" className="nimrose-icon-btn" onClick={() => shiftCursor(1)} aria-label="Next">
            <ChevronRight size={15} />
          </button>
          <button type="button" className="nimrose-chip" onClick={() => setCursor(new Date())}>
            Today
          </button>
        </div>
      )}

      {viewMode === "month" && (
        <div className="nimrose-cal-month-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="nimrose-cal-month-headcell">
              {d}
            </div>
          ))}
          {monthGrid.map((d) => {
            const key = toDayKey(d);
            const dayEvents = eventsByDay.get(key) ?? [];
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === toDayKey(new Date());
            return (
              <div key={key} className={`nimrose-cal-month-cell ${inMonth ? "" : "nimrose-cal-month-cell--out"} ${isToday ? "nimrose-cal-month-cell--today" : ""}`}>
                <span className="nimrose-cal-month-daynum">{d.getDate()}</span>
                {dayEvents.slice(0, 3).map((e) => (
                  <button key={e.id} type="button" className="nimrose-cal-event-chip" onClick={() => removeEvent(e)} title="Click to delete">
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 3 && <span className="nimrose-widget-footnote">+{dayEvents.length - 3} more</span>}
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "week" && (
        <div className="nimrose-cal-week-grid">
          {weekDays.map((d) => {
            const key = toDayKey(d);
            const dayEvents = (eventsByDay.get(key) ?? []).slice().sort((a, b) => a.startAt.localeCompare(b.startAt));
            const isToday = key === toDayKey(new Date());
            return (
              <div key={key} className={`nimrose-cal-week-col ${isToday ? "nimrose-cal-week-col--today" : ""}`}>
                <p className="nimrose-cal-week-head">
                  {d.toLocaleDateString(undefined, { weekday: "short" })} <span>{d.getDate()}</span>
                </p>
                {dayEvents.length === 0 ? (
                  <p className="nimrose-widget-footnote">—</p>
                ) : (
                  dayEvents.map((e) => (
                    <div key={e.id} className="nimrose-cal-week-event">
                      <span className="nimrose-widget-footnote">
                        {new Date(e.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <p>{e.title}</p>
                      <button type="button" onClick={() => removeEvent(e)} aria-label="Delete event">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NimroseCalendarView;
