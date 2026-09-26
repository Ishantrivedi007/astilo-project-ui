import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Palette, Search } from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { MODULE_NAV } from "../../app/moduleNav";
import { useAuth } from "../../auth/AuthProvider";
import { fetchNotifications } from "../../lib/notificationsApi";
import { openUniversalSearch } from "../Search/UniversalSearch";

const STANDALONE_LABELS: Record<string, string> = {
  [AppRoute.home]: "Home",
  [AppRoute.notifications]: "Notifications",
  [AppRoute.activityTimeline]: "Activity Timeline",
  [AppRoute.vault]: "Vault",
  [AppRoute.customize]: "Customize",
  [AppRoute.profile]: "Profile",
  [AppRoute.admin]: "Admin",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** Global chrome, not per-page content — a back button, the current
 * module's name (so you always know "where" you are without the sidebar),
 * a search trigger, and the same notifications/theme/profile access the
 * sidebar footer has, for when the rail is scrolled out of view or
 * collapsed. Desktop only; mobile already has its own top bar. */
const TopBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Same queryKey as NotificationBell's own query — react-query dedupes
  // identical key+fn pairs into one shared request/poll rather than two.
  const notifQuery = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => fetchNotifications({}),
    refetchInterval: 20_000,
  });
  const unread = notifQuery.data?.unreadCount ?? 0;

  const currentLabel = useMemo(() => {
    if (STANDALONE_LABELS[pathname]) return STANDALONE_LABELS[pathname];
    const mod = MODULE_NAV.find((m) => pathname.startsWith(m.route));
    return mod?.label ?? "Astilo";
  }, [pathname]);

  const isHome = pathname === AppRoute.home;

  return (
    <div className="app-topbar shell-glass">
      <button
        onClick={() => navigate(-1)}
        disabled={isHome}
        aria-label="Go back"
        className="app-topbar-back"
      >
        <ArrowLeft size={16} />
      </button>

      <p className="app-topbar-title">{currentLabel}</p>

      <button onClick={openUniversalSearch} className="app-topbar-search">
        <Search size={14} />
        <span>Search Astilo…</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div className="app-topbar-actions">
        <button
          onClick={() => navigate(AppRoute.notifications)}
          title={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          aria-label="Notifications"
          className="app-topbar-icon app-topbar-icon--bell"
        >
          <Bell size={16} />
          {unread > 0 && <span className="app-topbar-badge">{unread > 99 ? "99+" : unread}</span>}
        </button>
        <button
          onClick={() => navigate(AppRoute.customize)}
          title="Customize"
          aria-label="Customize"
          className="app-topbar-icon"
        >
          <Palette size={16} />
        </button>
        <button
          onClick={() => navigate(AppRoute.profile)}
          title={user?.name ?? "Profile"}
          aria-label="Profile"
          className="app-topbar-avatar"
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <span>{user?.name ? initials(user.name) : "?"}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
