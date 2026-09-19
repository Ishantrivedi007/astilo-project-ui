import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Clapperboard,
  Music,
  Sparkles,
  ShoppingBag,
  Palette,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  CalendarClock,
  Orbit,
  LineChart,
  FlaskConical,
  NotebookPen,
  MessageCircle,
  Library,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { useAuth } from "../../auth/AuthProvider";
import NotificationBell from "../Notifications/NotificationBell";

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: AppRoute.home, icon: Home },
  { label: "Movies", href: AppRoute.movies, icon: Clapperboard },
  { label: "Music", href: AppRoute.music, icon: Music },
  { label: "Anime", href: AppRoute.anime, icon: Sparkles },
  { label: "Store", href: AppRoute.store, icon: ShoppingBag },
  { label: "Cosmos", href: AppRoute.cosmos, icon: Orbit },
  { label: "Markets", href: AppRoute.markets, icon: LineChart },
  { label: "Research", href: AppRoute.research, icon: FlaskConical },
  { label: "Studio", href: AppRoute.office, icon: NotebookPen },
  { label: "Messenger", href: AppRoute.messenger, icon: MessageCircle },
  { label: "Library", href: AppRoute.library, icon: Library },
  { label: "Nimrose Desk", href: AppRoute.nimrose, icon: CalendarClock },
];

// Browser now lives inside Nimrose Desk rather than as its own top-level tile.
const COMING_SOON_ITEMS: { label: string; icon: typeof Home }[] = [];

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === AppRoute.home ? pathname === href : pathname.startsWith(href);

  const handleLogout = () => {
    logout();
    navigate(AppRoute.landing);
  };

  const railLinks = isAdmin
    ? [...NAV_ITEMS, { label: "Admin", href: AppRoute.admin, icon: ShieldCheck }]
    : NAV_ITEMS;

  const RailButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <button
        onClick={() => {
          navigate(item.href);
          setMobileOpen(false);
        }}
        title={item.label}
        aria-label={item.label}
        className={`sidebar-item ${active ? "sidebar-item--active" : ""}`}
      >
        <Icon size={20} strokeWidth={2} />
        <span className="sidebar-item-label">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop rail */}
      <aside className="sidebar-rail">
        <button
          onClick={() => navigate(AppRoute.home)}
          className="sidebar-brand"
          aria-label="Astilo's home"
        >
          A
        </button>

        <nav className="sidebar-nav">
          {railLinks.map((item) => (
            <RailButton key={item.href} item={item} />
          ))}

          <div className="sidebar-divider" />

          {COMING_SOON_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="sidebar-item sidebar-item--disabled" title={`${item.label} — coming soon`}>
                <Icon size={20} strokeWidth={2} />
                <span className="sidebar-item-label">{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <NotificationBell />
          <button
            onClick={() => navigate(AppRoute.customize)}
            title="Customize"
            aria-label="Customize"
            className={`sidebar-item ${isActive(AppRoute.customize) ? "sidebar-item--active" : ""}`}
          >
            <Palette size={20} strokeWidth={2} />
            <span className="sidebar-item-label">Customize</span>
          </button>
          <button
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="sidebar-item"
          >
            <LogOut size={20} strokeWidth={2} />
            <span className="sidebar-item-label">Log out</span>
          </button>
          <button
            onClick={() => navigate(AppRoute.profile)}
            title={user?.name ? `${user.name} — profile` : "Profile"}
            aria-label="Profile"
            className={`sidebar-avatar ${isActive(AppRoute.profile) ? "sidebar-avatar--active" : ""}`}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="sidebar-avatar-img" />
            ) : user?.name ? (
              initials(user.name)
            ) : (
              "?"
            )}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sidebar-mobile-bar">
        <button
          onClick={() => navigate(AppRoute.home)}
          className="sidebar-brand sidebar-brand--sm"
          aria-label="Astilo's home"
        >
          A
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="sidebar-item"
        >
          <Menu size={22} />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="sidebar-mobile-panel"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-2 pb-4">
              <span className="font-display text-lg font-bold uppercase tracking-[0.14em] text-ink">
                Astilo&apos;s
              </span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={22} className="text-ink/70" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {railLinks.map((item) => (
                <RailButton key={item.href} item={item} />
              ))}
              <button
                onClick={() => {
                  navigate(AppRoute.customize);
                  setMobileOpen(false);
                }}
                className={`sidebar-item ${isActive(AppRoute.customize) ? "sidebar-item--active" : ""}`}
              >
                <Palette size={20} />
                <span className="sidebar-item-label">Customize</span>
              </button>
              {COMING_SOON_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="sidebar-item sidebar-item--disabled">
                    <Icon size={20} />
                    <span className="sidebar-item-label">{item.label} · soon</span>
                  </div>
                );
              })}
              <button
                onClick={() => {
                  navigate(AppRoute.profile);
                  setMobileOpen(false);
                }}
                className={`sidebar-item ${isActive(AppRoute.profile) ? "sidebar-item--active" : ""}`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="sidebar-avatar-img sidebar-avatar-img--sm" />
                ) : (
                  <div className="sidebar-avatar sidebar-avatar--sm">
                    {user?.name ? initials(user.name) : "?"}
                  </div>
                )}
                <span className="sidebar-item-label">Profile</span>
              </button>
              <button onClick={handleLogout} className="sidebar-item">
                <LogOut size={20} />
                <span className="sidebar-item-label">Log out</span>
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
