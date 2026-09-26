import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, History, Trash2 } from "lucide-react";
import { AppRoute } from "../../app/AppRoute";

import {
  clearAllNotifications,
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationModule,
} from "../../lib/notificationsApi";
import { MODULE_ICON, MODULE_LABEL, timeAgo } from "./moduleMeta";
import "./Notifications.scss";

const NotificationsView = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState<NotificationModule | "all">("all");

  const query = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: () => fetchNotifications({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markReadMutation = useMutation({ mutationFn: (id: number) => markNotificationRead(id), onSuccess: invalidate });
  const markAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: (id: number) => deleteNotification(id), onSuccess: invalidate });
  const clearAllMutation = useMutation({ mutationFn: clearAllNotifications, onSuccess: invalidate });

  const all = query.data?.results ?? [];
  const byModule = useMemo(() => {
    const counts = new Map<NotificationModule, number>();
    for (const n of all) counts.set(n.module, (counts.get(n.module) ?? 0) + 1);
    return counts;
  }, [all]);
  const filtered = activeModule === "all" ? all : all.filter((n) => n.module === activeModule);
  const modulesPresent = [...byModule.keys()];

  const openItem = (n: AppNotification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="notif-page">
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Astilo</p>
          <h1 className="nimrose-page-title">
            <Bell size={22} style={{ display: "inline", verticalAlign: "-4px", marginRight: 8 }} />
            Notifications
          </h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="nimrose-chip" onClick={() => navigate(AppRoute.activityTimeline)}>
            <History size={12} /> Activity Timeline
          </button>
          <button type="button" className="nimrose-chip" onClick={() => markAllMutation.mutate()} disabled={(query.data?.unreadCount ?? 0) === 0}>
            <CheckCheck size={12} /> Mark all read
          </button>
          <button type="button" className="nimrose-chip" onClick={() => clearAllMutation.mutate()} disabled={all.length === 0}>
            <Trash2 size={12} /> Clear all
          </button>
        </div>
      </div>

      <div className="notif-page-tabs">
        <button type="button" className={`notif-page-tab ${activeModule === "all" ? "active" : ""}`} onClick={() => setActiveModule("all")}>
          All ({all.length})
        </button>
        {modulesPresent.map((m) => (
          <button key={m} type="button" className={`notif-page-tab ${activeModule === m ? "active" : ""}`} onClick={() => setActiveModule(m)}>
            {MODULE_LABEL[m]} ({byModule.get(m)})
          </button>
        ))}
      </div>

      {query.isLoading && <p className="notif-empty">Loading…</p>}
      {!query.isLoading && filtered.length === 0 && <p className="notif-empty">No notifications here yet.</p>}

      <div className="notif-page-list">
        {filtered.map((n) => {
          const Icon = MODULE_ICON[n.module];
          return (
            <div key={n.id} className={`notif-page-item ${!n.read ? "unread" : ""}`}>
              <span className="notif-dot" style={{ marginTop: "0.5rem" }} />
              <div className="notif-item-body" style={{ cursor: n.link ? "pointer" : "default" }} onClick={() => openItem(n)}>
                <p className="title">{n.title}</p>
                {n.body && <p className="desc">{n.body}</p>}
                <p className="meta">
                  <Icon size={11} /> {MODULE_LABEL[n.module]} · {timeAgo(n.createdAt)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                {!n.read && (
                  <button type="button" className="notif-module-pill" style={{ cursor: "pointer" }} onClick={() => markReadMutation.mutate(n.id)}>
                    Mark read
                  </button>
                )}
                <button type="button" className="notif-module-pill" style={{ cursor: "pointer" }} onClick={() => deleteMutation.mutate(n.id)} aria-label="Delete">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsView;
