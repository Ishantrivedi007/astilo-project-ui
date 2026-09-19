import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { fetchNimroseCalendarEvents, type NimroseCalendarEvent } from "../../lib/nimroseApi";
import CalendarEventModal from "./CalendarEventModal";

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

type ModalState = { mode: "create"; defaultStartAt: string } | { mode: "edit"; event: NimroseCalendarEvent } | null;

const NimroseCalendarView = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("agenda");
  const [cursor, setCursor] = useState(() => new Date());
  const [modal, setModal] = useState<ModalState>(null);

  const eventsQuery = useQuery({
    queryKey: ["nimrose", "calendar-events"],
    queryFn: () => fetchNimroseCalendarEvents(),
  });

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

  const openCreateAt = (day: Date, hour = 9) => {
    const d = new Date(day);
    d.setHours(hour, 0, 0, 0);
    setModal({ mode: "create", defaultStartAt: d.toISOString() });
  };

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Calendar</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
          <button type="button" className="nimrose-chip" onClick={() => openCreateAt(new Date())}>
            <Plus size={12} /> New event
          </button>
        </div>
      </div>

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
                  <li key={event.id} className="glass-card nimrose-agenda-item" onClick={() => setModal({ mode: "edit", event })} style={{ cursor: "pointer" }}>
                    <div className="nimrose-agenda-time" style={event.color ? { color: event.color } : undefined}>
                      {new Date(event.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="nimrose-agenda-body">
                      <p>{event.title}</p>
                      <div className="nimrose-full-task-meta">
                        {event.category && <span className="nimrose-chip">{event.category}</span>}
                        {event.location && <span className="nimrose-chip">📍 {event.location}</span>}
                        {event.projectName && <span className="nimrose-chip">{event.projectName}</span>}
                        {event.relatedTaskTitle && <span className="nimrose-chip">↳ {event.relatedTaskTitle}</span>}
                      </div>
                    </div>
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
              <div
                key={key}
                className={`nimrose-cal-month-cell ${inMonth ? "" : "nimrose-cal-month-cell--out"} ${isToday ? "nimrose-cal-month-cell--today" : ""}`}
                onClick={() => openCreateAt(d)}
              >
                <span className="nimrose-cal-month-daynum">{d.getDate()}</span>
                {dayEvents.slice(0, 3).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="nimrose-cal-event-chip"
                    style={e.color ? { borderColor: e.color, color: e.color } : undefined}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setModal({ mode: "edit", event: e });
                    }}
                    title="Click to edit"
                  >
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
              <div key={key} className={`nimrose-cal-week-col ${isToday ? "nimrose-cal-week-col--today" : ""}`} onClick={() => openCreateAt(d)}>
                <p className="nimrose-cal-week-head">
                  {d.toLocaleDateString(undefined, { weekday: "short" })} <span>{d.getDate()}</span>
                </p>
                {dayEvents.length === 0 ? (
                  <p className="nimrose-widget-footnote">—</p>
                ) : (
                  dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className="nimrose-cal-week-event"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setModal({ mode: "edit", event: e });
                      }}
                      style={e.color ? { borderLeftColor: e.color } : undefined}
                    >
                      <span className="nimrose-widget-footnote">
                        {new Date(e.startAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <p>{e.title}</p>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <CalendarEventModal
          event={modal.mode === "edit" ? modal.event : null}
          defaultStartAt={modal.mode === "create" ? modal.defaultStartAt : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default NimroseCalendarView;
