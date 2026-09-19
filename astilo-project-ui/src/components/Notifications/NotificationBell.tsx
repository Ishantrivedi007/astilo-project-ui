import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, type AppNotification } from "../../lib/notificationsApi";
import { MODULE_ICON, MODULE_LABEL, timeAgo } from "./moduleMeta";
import "./Notifications.scss";

/** A global bell (not scoped to Nimrose) since notifications now span
 * Kanban/Research/Calendar/etc. Polls every 20s — genuinely real-time
 * (push/websocket) is a documented future step; this keeps the badge
 * fresh without the client hammering the API. */
const NotificationBell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const query = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => fetchNotifications({}),
    refetchInterval: 20_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const markReadMutation = useMutation({ mutationFn: (id: number) => markNotificationRead(id), onSuccess: invalidate });
  const markAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  const items = (query.data?.results ?? []).slice(0, 8);
  const unread = query.data?.unreadCount ?? 0;

  const openItem = (n: AppNotification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const rect = anchorRef.current?.getBoundingClientRect();

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className="sidebar-item notif-bell"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        title="Notifications"
      >
        <Bell size={20} strokeWidth={2} />
        {unread > 0 && <span className="notif-bell-badge">{unread > 99 ? "99+" : unread}</span>}
        <span className="sidebar-item-label">Notifications</span>
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={() => setOpen(false)} />
          <div
            className="notif-panel"
            style={{
              top: rect ? Math.min(rect.top, window.innerHeight - 420) : 60,
              left: rect ? rect.right + 10 : 60,
            }}
          >
            <div className="notif-panel-header">
              <h3>Notifications</h3>
              <button type="button" onClick={() => markAllMutation.mutate()} disabled={unread === 0}>
                <CheckCheck size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Mark all read
              </button>
            </div>

            {items.length === 0 && <p className="notif-empty">Nothing yet — you'll see it here when something's added.</p>}

            {items.map((n) => {
              const Icon = MODULE_ICON[n.module];
              return (
                <button key={n.id} type="button" className={`notif-item ${!n.read ? "unread" : ""}`} onClick={() => openItem(n)}>
                  <span className={`notif-dot ${n.read ? "read" : ""}`} />
                  <span className="notif-item-body">
                    <p className="title">{n.title}</p>
                    {n.body && <p className="desc">{n.body}</p>}
                    <p className="meta">
                      <Icon size={11} /> {MODULE_LABEL[n.module]} · {timeAgo(n.createdAt)}
                    </p>
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              className="notif-item"
              style={{ justifyContent: "center", color: "rgba(232,236,255,0.6)", fontSize: "0.75rem" }}
              onClick={() => {
                setOpen(false);
                navigate(AppRoute.notifications);
              }}
            >
              View all notifications
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default NotificationBell;
