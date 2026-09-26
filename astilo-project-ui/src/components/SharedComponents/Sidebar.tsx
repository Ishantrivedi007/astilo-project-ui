import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Palette,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Settings,
  Bell,
  History,
  Archive,
  type LucideIcon,
} from "lucide-react";

import { AppRoute } from "../../app/AppRoute";
import { CATEGORY_ICON, CATEGORY_LABEL, CATEGORY_ORDER, MODULE_NAV, type NavCategory, type NavModule } from "../../app/moduleNav";
import { useAuth } from "../../auth/AuthProvider";
import { fetchNotifications } from "../../lib/notificationsApi";
import { openUniversalSearch } from "../Search/UniversalSearch";

const RAIL_EXPANDED_KEY = "astilo.sidebar.expanded";
const COLLAPSED_WIDTH = "4.75rem";
const EXPANDED_WIDTH = "10.5rem";

type BoxKey = NavCategory | "system";

interface SystemItem {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
}

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
  const [mobileOpenGroups, setMobileOpenGroups] = useState<Set<string>>(new Set());
  const [openBox, setOpenBox] = useState<BoxKey | null>(null);
  const [openBoxModules, setOpenBoxModules] = useState<Set<string>>(new Set());
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [railExpanded, setRailExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RAIL_EXPANDED_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Drives --sidebar-width, which .sidebar-rail and .app-content both read.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", railExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH);
  }, [railExpanded]);

  const toggleRailExpanded = () => {
    setRailExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(RAIL_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        /* private mode / quota — expansion just won't persist */
      }
      return next;
    });
  };

  const isActive = (href: string) =>
    href === AppRoute.home ? pathname === href : pathname.startsWith(href.split("?")[0]);

  // Sidebar personalization (Customize page): null/undefined means "never
  // customized" — every module counts toward its category's box.
  const visibleModules = useMemo(
    () => (user?.pinnedModules ? MODULE_NAV.filter((m) => user.pinnedModules!.includes(m.id)) : MODULE_NAV),
    [user?.pinnedModules]
  );

  const notifQuery = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => fetchNotifications({}),
    refetchInterval: 20_000,
  });
  const unread = notifQuery.data?.unreadCount ?? 0;

  const SYSTEM_ITEMS: SystemItem[] = [
    { id: "notifications", label: "Notifications", route: AppRoute.notifications, icon: Bell },
    { id: "activity", label: "Activity Timeline", route: AppRoute.activityTimeline, icon: History },
    { id: "vault", label: "Vault", route: AppRoute.vault, icon: Archive },
    { id: "customize", label: "Customize", route: AppRoute.customize, icon: Palette },
  ];

  const closeBox = () => {
    setOpenBox(null);
    setOpenBoxModules(new Set());
  };

  useEffect(() => {
    if (!openBox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openBox]);

  // Close whenever the route changes (e.g. a Universal Search jump), so a
  // stale box doesn't linger open over a different page.
  useEffect(() => {
    closeBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleBoxTrigger = (key: BoxKey, e: React.MouseEvent<HTMLButtonElement>) => {
    anchorRef.current = e.currentTarget;
    setOpenBoxModules(new Set());
    setOpenBox((prev) => (prev === key ? null : key));
  };

  const toggleBoxModule = (id: string) => {
    setOpenBoxModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMobileGroup = (id: string) => {
    setMobileOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate(AppRoute.landing);
  };

  const categoryActive = (category: NavCategory) => visibleModules.some((m) => m.category === category && isActive(m.route));
  const systemActive = SYSTEM_ITEMS.some((i) => isActive(i.route));

  /** A single icon in the rail representing a whole category (or "System")
   * — clicking opens the box listing its members; it never navigates by
   * itself, since a category has no page of its own. */
  const CategoryTrigger = ({ id, label, icon: Icon, active }: { id: BoxKey; label: string; icon: LucideIcon; active: boolean }) => (
    <button
      type="button"
      onClick={(e) => handleBoxTrigger(id, e)}
      title={railExpanded ? undefined : label}
      aria-label={label}
      aria-expanded={openBox === id}
      className={`sidebar-item ${railExpanded ? "sidebar-item--expanded" : ""} ${active ? "sidebar-item--active" : ""} ${
        openBox === id ? "sidebar-item--open" : ""
      }`}
    >
      <Icon size={20} strokeWidth={2} />
      <span className={`sidebar-item-label ${railExpanded ? "sidebar-item-label--visible" : ""}`}>{label}</span>
    </button>
  );

  const SidebarLink = ({
    icon: Icon,
    label,
    active,
    onClick,
  }: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      title={railExpanded ? undefined : label}
      aria-label={label}
      className={`sidebar-item ${railExpanded ? "sidebar-item--expanded" : ""} ${active ? "sidebar-item--active" : ""}`}
    >
      <Icon size={20} strokeWidth={2} />
      <span className={`sidebar-item-label ${railExpanded ? "sidebar-item-label--visible" : ""}`}>{label}</span>
    </button>
  );

  /** Mobile: category row expands to its modules; a module with its own
   * sub-pages gets a second chevron for those. Two-level accordion instead
   * of the desktop's click-box, since there's no "outside the sidebar" on
   * a full-screen mobile panel to float a box over. */
  const MobileModuleRow = ({ mod }: { mod: NavModule }) => {
    const Icon = mod.icon;
    const hasChildren = mod.children.length > 0;
    const isOpen = mobileOpenGroups.has(mod.id);
    return (
      <div>
        <div className={`sidebar-item flex w-full justify-start gap-3 ${isActive(mod.route) ? "sidebar-item--active" : ""}`}>
          <button
            onClick={() => {
              navigate(mod.route);
              setMobileOpen(false);
            }}
            className="flex flex-1 items-center gap-3"
          >
            <Icon size={18} />
            <span className="sidebar-item-label">{mod.label}</span>
          </button>
          {hasChildren && (
            <button onClick={() => toggleMobileGroup(mod.id)} aria-label={isOpen ? `Collapse ${mod.label}` : `Expand ${mod.label}`} className="p-1">
              <ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {hasChildren && isOpen && (
          <div className="ml-7 flex flex-col gap-0.5 border-l border-hair/15 pl-3">
            {mod.children.map((child) => {
              const ChildIcon = child.icon;
              return (
                <button
                  key={child.id}
                  onClick={() => {
                    navigate(child.route);
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink/60 hover:bg-ink/5 hover:text-ink"
                >
                  <ChildIcon size={13} />
                  <span className="truncate">{child.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const MobileCategoryGroup = ({ category }: { category: NavCategory }) => {
    const Icon = CATEGORY_ICON[category];
    const items = visibleModules.filter((m) => m.category === category);
    if (items.length === 0) return null;
    const isOpen = mobileOpenGroups.has(category);
    return (
      <div>
        <button
          onClick={() => toggleMobileGroup(category)}
          className={`sidebar-item w-full justify-start gap-3 ${categoryActive(category) ? "sidebar-item--active" : ""}`}
        >
          <Icon size={18} />
          <span className="sidebar-item-label flex-1">{CATEGORY_LABEL[category]}</span>
          <ChevronDown size={15} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="ml-3 flex flex-col gap-0.5 border-l border-hair/15 pl-2">
            {items.map((mod) => (
              <MobileModuleRow key={mod.id} mod={mod} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Positioned to the right of whichever icon triggered it — box is a
  // portal, so it floats outside (visually on top of, unclipped by) the
  // narrow rail regardless of scroll position.
  const boxRect = openBox && anchorRef.current ? anchorRef.current.getBoundingClientRect() : null;
  const boxLabel = openBox === "system" ? "System" : openBox ? CATEGORY_LABEL[openBox] : "";
  const boxModules = openBox && openBox !== "system" ? visibleModules.filter((m) => m.category === openBox) : null;

  return (
    <>
      {/* Desktop rail — categories only; clicking one opens its box. */}
      <aside className={`sidebar-rail shell-glass ${railExpanded ? "sidebar-rail--expanded" : ""}`}>
        <button onClick={() => navigate(AppRoute.home)} className="sidebar-brand" aria-label="Astilo's home">
          A
        </button>

        <nav className={`sidebar-nav ${railExpanded ? "sidebar-nav--expanded" : ""}`}>
          <SidebarLink icon={Home} label="Home" active={isActive(AppRoute.home)} onClick={() => navigate(AppRoute.home)} />
          <SidebarLink icon={Search} label="Search" onClick={openUniversalSearch} />

          <div className={`sidebar-group ${railExpanded ? "sidebar-group--expanded" : ""}`}>
            {CATEGORY_ORDER.map((category) => (
              <CategoryTrigger
                key={category}
                id={category}
                label={CATEGORY_LABEL[category]}
                icon={CATEGORY_ICON[category]}
                active={categoryActive(category)}
              />
            ))}
          </div>

          {isAdmin && (
            <div className={`sidebar-group ${railExpanded ? "sidebar-group--expanded" : ""}`}>
              <SidebarLink icon={ShieldCheck} label="Admin" active={isActive(AppRoute.admin)} onClick={() => navigate(AppRoute.admin)} />
            </div>
          )}

          <div className={`sidebar-group ${railExpanded ? "sidebar-group--expanded" : ""}`}>
            <CategoryTrigger id="system" label="System" icon={Settings} active={systemActive} />
          </div>
        </nav>

        <div className={`sidebar-footer ${railExpanded ? "sidebar-footer--expanded" : ""}`}>
          <SidebarLink icon={LogOut} label="Log out" onClick={handleLogout} />

          <button
            onClick={() => navigate(AppRoute.profile)}
            title={railExpanded ? undefined : user?.name ? `${user.name} — profile` : "Profile"}
            aria-label="Profile"
            className={`${railExpanded ? "sidebar-item sidebar-item--expanded" : "sidebar-avatar"} ${
              isActive(AppRoute.profile) ? (railExpanded ? "sidebar-item--active" : "sidebar-avatar--active") : ""
            }`}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className={railExpanded ? "sidebar-avatar-img--sm" : "sidebar-avatar-img"} />
            ) : (
              <span className={railExpanded ? "" : "contents"}>{user?.name ? initials(user.name) : "?"}</span>
            )}
            {railExpanded && <span className="sidebar-item-label sidebar-item-label--visible">{user?.name ?? "Profile"}</span>}
          </button>

          <button
            onClick={toggleRailExpanded}
            title={railExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={railExpanded ? "Collapse sidebar" : "Expand sidebar"}
            className={`sidebar-item ${railExpanded ? "sidebar-item--expanded" : ""}`}
          >
            {railExpanded ? <ChevronsLeft size={20} strokeWidth={2} /> : <ChevronsRight size={20} strokeWidth={2} />}
            <span className={`sidebar-item-label ${railExpanded ? "sidebar-item-label--visible" : ""}`}>
              {railExpanded ? "Collapse" : "Expand"}
            </span>
          </button>
        </div>
      </aside>

      {/* The category/system box — a portal so it floats outside the rail. */}
      {openBox &&
        boxRect &&
        createPortal(
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 290 }} onClick={closeBox} />
            <div
              className="sidebar-category-box shell-glass"
              style={{
                top: Math.min(boxRect.top, window.innerHeight - 320),
                left: boxRect.right + 10,
              }}
            >
              <p className="sidebar-flyout-title">{boxLabel}</p>

              {openBox === "system"
                ? SYSTEM_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          navigate(item.route);
                          closeBox();
                        }}
                        className="sidebar-flyout-item"
                      >
                        <Icon size={14} strokeWidth={2} />
                        <span className="flex-1">{item.label}</span>
                        {item.id === "notifications" && unread > 0 && (
                          <span className="sidebar-flyout-badge">{unread > 99 ? "99+" : unread}</span>
                        )}
                      </button>
                    );
                  })
                : boxModules?.map((mod) => {
                    const Icon = mod.icon;
                    const hasChildren = mod.children.length > 0;
                    const isModOpen = openBoxModules.has(mod.id);
                    return (
                      <div key={mod.id}>
                        <div className="sidebar-flyout-item-row">
                          <button
                            type="button"
                            onClick={() => {
                              navigate(mod.route);
                              closeBox();
                            }}
                            className="sidebar-flyout-item flex-1"
                          >
                            <Icon size={14} strokeWidth={2} />
                            <span>{mod.label}</span>
                          </button>
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={() => toggleBoxModule(mod.id)}
                              aria-label={isModOpen ? `Collapse ${mod.label}` : `Expand ${mod.label}`}
                              className="sidebar-flyout-chevron"
                            >
                              <ChevronDown size={13} className={`transition-transform ${isModOpen ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        {hasChildren && isModOpen && (
                          <div className="sidebar-flyout-children">
                            {mod.children.map((child) => {
                              const ChildIcon = child.icon;
                              return (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => {
                                    navigate(child.route);
                                    closeBox();
                                  }}
                                  className="sidebar-flyout-subitem"
                                >
                                  <ChildIcon size={13} strokeWidth={2} />
                                  <span className="truncate">{child.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>
          </>,
          document.body
        )}

      {/* Mobile top bar */}
      <div className="sidebar-mobile-bar shell-glass">
        <button onClick={() => navigate(AppRoute.home)} className="sidebar-brand sidebar-brand--sm" aria-label="Astilo's home">
          A
        </button>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="sidebar-item">
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
              <span className="font-display text-lg font-bold uppercase tracking-[0.14em] text-ink">Astilo&apos;s</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X size={22} className="text-ink/70" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => {
                  openUniversalSearch();
                  setMobileOpen(false);
                }}
                className="sidebar-item w-full justify-start gap-3"
              >
                <Search size={20} />
                <span className="sidebar-item-label">Search</span>
              </button>

              <button
                onClick={() => {
                  navigate(AppRoute.home);
                  setMobileOpen(false);
                }}
                className={`sidebar-item w-full justify-start gap-3 ${isActive(AppRoute.home) ? "sidebar-item--active" : ""}`}
              >
                <Home size={20} />
                <span className="sidebar-item-label">Home</span>
              </button>

              {CATEGORY_ORDER.map((category) => (
                <MobileCategoryGroup key={category} category={category} />
              ))}

              {isAdmin && (
                <button
                  onClick={() => {
                    navigate(AppRoute.admin);
                    setMobileOpen(false);
                  }}
                  className={`sidebar-item w-full justify-start gap-3 ${isActive(AppRoute.admin) ? "sidebar-item--active" : ""}`}
                >
                  <ShieldCheck size={20} />
                  <span className="sidebar-item-label">Admin</span>
                </button>
              )}

              <p className="mt-2 px-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">System</p>
              {SYSTEM_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.route);
                      setMobileOpen(false);
                    }}
                    className={`sidebar-item w-full justify-start gap-3 ${isActive(item.route) ? "sidebar-item--active" : ""}`}
                  >
                    <Icon size={20} />
                    <span className="sidebar-item-label flex-1">{item.label}</span>
                    {item.id === "notifications" && unread > 0 && <span className="sidebar-flyout-badge">{unread > 99 ? "99+" : unread}</span>}
                  </button>
                );
              })}

              <button
                onClick={() => {
                  navigate(AppRoute.profile);
                  setMobileOpen(false);
                }}
                className={`sidebar-item w-full justify-start gap-3 mt-2 ${isActive(AppRoute.profile) ? "sidebar-item--active" : ""}`}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="sidebar-avatar-img sidebar-avatar-img--sm" />
                ) : (
                  <div className="sidebar-avatar sidebar-avatar--sm">{user?.name ? initials(user.name) : "?"}</div>
                )}
                <span className="sidebar-item-label">Profile</span>
              </button>
              <button onClick={handleLogout} className="sidebar-item w-full justify-start gap-3">
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
