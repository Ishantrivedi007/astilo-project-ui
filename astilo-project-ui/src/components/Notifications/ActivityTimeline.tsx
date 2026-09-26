import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";

import { fetchNotifications, type AppNotification, type NotificationModule } from "../../lib/notificationsApi";
import { MODULE_ICON, MODULE_LABEL, timeAgo } from "./moduleMeta";
import "./Notifications.scss";

const dayLabel = (iso: string | null) => {
  if (!iso) return "Earlier";
  const date = new Date(iso);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

/** Every real event the app has recorded, chronologically — the same
 * Notification rows the inbox uses (see notifications_controller.py's
 * docstring: "created when the event happens"), just presented as an
 * immutable history feed grouped by day instead of an actionable inbox.
 * No mark-read/delete here on purpose — this is the record of what
 * happened, not a todo list. */
const ActivityTimeline = () => {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<NotificationModule | "all">("all");

  const query = useQuery({
    queryKey: ["notifications", "timeline"],
    queryFn: () => fetchNotifications({ limit: 300 }),
  });

  const all = query.data?.results ?? [];
  const byModule = useMemo(() => {
    const counts = new Map<NotificationModule, number>();
    for (const n of all) counts.set(n.module, (counts.get(n.module) ?? 0) + 1);
    return counts;
  }, [all]);
  const modulesPresent = [...byModule.keys()];
  const filtered = activeModule === "all" ? all : all.filter((n) => n.module === activeModule);

  const groups = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const n of filtered) {
      const label = dayLabel(n.createdAt);
      const bucket = map.get(label) ?? [];
      bucket.push(n);
      map.set(label, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  const openItem = (n: AppNotification) => {
    if (n.link) navigate(n.link);
  };

  return (
    <div className="notif-page">
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Astilo</p>
          <h1 className="nimrose-page-title">
            <History size={22} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
            Activity Timeline
          </h1>
        </div>
      </div>

      <div className="notif-page-tabs">
        <button
          type="button"
          className={`notif-page-tab ${activeModule === "all" ? "active" : ""}`}
          onClick={() => setActiveModule("all")}
        >
          All ({all.length})
        </button>
        {modulesPresent.map((m) => (
          <button
            key={m}
            type="button"
            className={`notif-page-tab ${activeModule === m ? "active" : ""}`}
            onClick={() => setActiveModule(m)}
          >
            {MODULE_LABEL[m]} ({byModule.get(m)})
          </button>
        ))}
      </div>

      {query.isLoading && <p className="notif-empty">Loading…</p>}
      {!query.isLoading && filtered.length === 0 && <p className="notif-empty">Nothing recorded yet.</p>}

      {groups.map(([label, items]) => (
        <div key={label} style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              opacity: 0.4,
              margin: "0.75rem 0 0.5rem",
            }}
          >
            {label}
          </p>
          <div className="notif-page-list">
            {items.map((n) => {
              const Icon = MODULE_ICON[n.module];
              return (
                <div key={n.id} className={`notif-page-item ${!n.read ? "unread" : ""}`}>
                  <span className="notif-dot" style={{ marginTop: "0.5rem" }} />
                  <div
                    className="notif-item-body"
                    style={{ cursor: n.link ? "pointer" : "default" }}
                    onClick={() => openItem(n)}
                  >
                    <p className="title">{n.title}</p>
                    {n.body && <p className="desc">{n.body}</p>}
                    <p className="meta">
                      <Icon size={11} /> {MODULE_LABEL[n.module]} · {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
