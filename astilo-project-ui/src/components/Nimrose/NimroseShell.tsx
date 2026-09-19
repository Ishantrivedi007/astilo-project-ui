import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AppRoute } from "../../app/AppRoute";
import NimroseSidebar from "./NimroseSidebar";
import NimroseContextPanel from "./NimroseContextPanel";
import NimroseHome from "./NimroseHome";
import NimroseTasksView from "./NimroseTasksView";
import NimroseCalendarView from "./NimroseCalendarView";
import NimroseKanbanView from "./NimroseKanbanView";
import NimroseSprintsView from "./NimroseSprintsView";
import NimroseBacklogView from "./NimroseBacklogView";
import NimroseNotesView from "./NimroseNotesView";
import NimroseFocusView from "./NimroseFocusView";
import NimroseBrowserView from "./NimroseBrowserView";
import NimroseBookmarksView from "./NimroseBookmarksView";
import NimroseSettingsView from "./NimroseSettingsView";
import NimroseCommandPalette from "./NimroseCommandPalette";
import { NimroseFocusProvider, useNimroseFocus } from "./NimroseFocusContext";
import { NimrosePromptProvider } from "./NimrosePromptDialog";
import "./Nimrose.scss";

const COLLAPSE_KEY = "nimrose-sidebar-collapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const NimroseShellInner = ({
  active,
  setActive,
  collapsed,
  toggleCollapsed,
}: {
  active: string;
  setActive: (id: string) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
}) => {
  const navigate = useNavigate();
  const { immersive } = useNimroseFocus();
  const isImmersiveFocus = active === "focus" && immersive;

  const handleSelect = (id: string) => {
    // Themes isn't a Nimrose-internal view — Nimrose follows the app's
    // existing theme system rather than duplicating a picker, so this just
    // hands off to the real Customize page.
    if (id === "themes") {
      navigate(AppRoute.customize);
      return;
    }
    setActive(id);
  };

  return (
    <div className={`nimrose-shell ${isImmersiveFocus ? "nimrose-shell--immersive" : ""}`}>
      {!isImmersiveFocus && (
        <NimroseSidebar active={active} onSelect={handleSelect} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      )}
      <main className="nimrose-workspace">
        {active === "home" && <NimroseHome />}
        {active === "tasks" && <NimroseTasksView />}
        {active === "calendar" && <NimroseCalendarView />}
        {(active === "kanban" || active === "projects") && <NimroseKanbanView />}
        {active === "sprints" && <NimroseSprintsView />}
        {active === "backlog" && <NimroseBacklogView />}
        {active === "notes" && <NimroseNotesView />}
        {active === "focus" && <NimroseFocusView />}
        {active === "browser" && <NimroseBrowserView />}
        {active === "bookmarks" && <NimroseBookmarksView />}
        {active === "saved" && <NimroseBookmarksView readLaterOnly />}
        {active === "settings" && <NimroseSettingsView />}
      </main>
      {!isImmersiveFocus && <NimroseContextPanel />}
      <NimroseCommandPalette onNavigate={setActive} />
    </div>
  );
};

const VALID_SECTIONS = [
  "home", "tasks", "calendar", "kanban", "projects", "sprints", "backlog",
  "notes", "focus", "browser", "bookmarks", "saved", "settings",
];

const NimroseShell = () => {
  // Lets other parts of the app deep-link into a specific Nimrose section,
  // e.g. Cosmos's "Research this object" opening straight into Notes —
  // only read once on mount, not kept in sync with the URL afterward,
  // since section switches are otherwise local UI state (see NimroseSidebar).
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get("section");
  const [active, setActive] = useState(
    initialSection && VALID_SECTIONS.includes(initialSection) ? initialSection : "home"
  );
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <NimrosePromptProvider>
      <NimroseFocusProvider>
        <NimroseShellInner active={active} setActive={setActive} collapsed={collapsed} toggleCollapsed={toggleCollapsed} />
      </NimroseFocusProvider>
    </NimrosePromptProvider>
  );
};

export default NimroseShell;
