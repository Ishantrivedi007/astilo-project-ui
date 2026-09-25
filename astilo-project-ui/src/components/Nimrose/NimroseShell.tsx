import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AppRoute } from "../../app/AppRoute";
import NimroseSidebar from "./NimroseSidebar";
import NimroseContextPanel from "./NimroseContextPanel";
import NimroseHome from "./NimroseHome";
import NimroseTasksView from "./NimroseTasksView";
import NimroseCalendarView from "./NimroseCalendarView";
import NimroseKanbanView from "./NimroseKanbanView";
import NimroseSprintsView from "./NimroseSprintsView";
import NimrosePhasesView from "./NimrosePhasesView";
import NimroseBacklogView from "./NimroseBacklogView";
import NimroseAnalyticsView from "./NimroseAnalyticsView";
import NimroseNotesView from "./NimroseNotesView";
import NimroseResearchWorkspaceView from "./NimroseResearchWorkspaceView";
import NimroseProjectWorkspaceView from "./NimroseProjectWorkspaceView";
import NimroseChatView from "./NimroseChatView";
import NimroseFocusView from "./NimroseFocusView";
import NimroseBrowserView from "./NimroseBrowserView";
import NimroseBookmarksView from "./NimroseBookmarksView";
import NimroseSettingsView from "./NimroseSettingsView";
import NimroseCommandPalette from "./NimroseCommandPalette";
import NimrosePulse from "./NimrosePulse";
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
  const [searchParams] = useSearchParams();
  const { immersive } = useNimroseFocus();
  const isImmersiveFocus = active === "focus" && immersive;
  // Context Bubbles restore by navigating to a stored ?section=&... —
  // several views only read their project/ticket/etc ids from the URL
  // once, in a useState initializer, with no re-sync effect. Keying the
  // multi-view branches on the full query string forces a clean remount
  // whenever a bubble is restored (or any other query-param navigation
  // happens) so those initializers re-run against the new params, without
  // auditing every view's internals individually.
  const viewKey = searchParams.toString();

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
        {(active === "kanban" || active === "projects") && <NimroseKanbanView key={viewKey} />}
        {active === "sprints" && <NimroseSprintsView />}
        {active === "phases" && <NimrosePhasesView />}
        {active === "backlog" && <NimroseBacklogView />}
        {active === "analytics" && <NimroseAnalyticsView />}
        {active === "notes" && <NimroseNotesView />}
        {active === "workspace" && <NimroseResearchWorkspaceView key={viewKey} />}
        {active === "project-workspace" && <NimroseProjectWorkspaceView key={viewKey} />}
        {active === "chat" && <NimroseChatView />}
        {active === "focus" && <NimroseFocusView />}
        {active === "browser" && <NimroseBrowserView />}
        {active === "bookmarks" && <NimroseBookmarksView />}
        {active === "saved" && <NimroseBookmarksView readLaterOnly />}
        {active === "settings" && <NimroseSettingsView />}
      </main>
      {!isImmersiveFocus && (
        <>
          <NimroseContextPanel active={active} />
          <div className="nimrose-pulse-anchor">
            <NimrosePulse onNavigate={setActive} />
          </div>
        </>
      )}
      <NimroseCommandPalette onNavigate={setActive} />
    </div>
  );
};

const VALID_SECTIONS = [
  "home", "tasks", "calendar", "kanban", "projects", "sprints", "phases", "backlog", "analytics",
  "notes", "workspace", "project-workspace", "chat", "focus", "browser", "bookmarks", "saved", "settings",
];

const NimroseShell = () => {
  // Lets other parts of the app deep-link into a specific Nimrose section,
  // e.g. Cosmos's "Research this object" opening straight into Notes, or a
  // notification linking into the exact project/sprint/phase/ticket it's
  // about. Re-syncs whenever ?section= changes (not just on first mount) so
  // clicking a notification while Nimrose is already open still switches
  // section — project/sprint/ticket ids themselves are read by each view
  // via its own useSearchParams, since those aren't shell-level state.
  const [searchParams] = useSearchParams();
  const urlSection = searchParams.get("section");
  const [active, setActive] = useState(
    urlSection && VALID_SECTIONS.includes(urlSection) ? urlSection : "home"
  );
  useEffect(() => {
    if (urlSection && VALID_SECTIONS.includes(urlSection)) setActive(urlSection);
  }, [urlSection]);
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
