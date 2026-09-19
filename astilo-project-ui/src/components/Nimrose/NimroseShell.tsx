import { useState } from "react";

import NimroseSidebar, { NIMROSE_SECTIONS } from "./NimroseSidebar";
import NimroseContextPanel from "./NimroseContextPanel";
import NimroseHome from "./NimroseHome";
import NimroseTasksView from "./NimroseTasksView";
import NimroseCalendarView from "./NimroseCalendarView";
import NimroseKanbanView from "./NimroseKanbanView";
import NimroseNotesView from "./NimroseNotesView";
import NimroseFocusView from "./NimroseFocusView";
import NimroseBrowserView from "./NimroseBrowserView";
import NimroseCommandPalette from "./NimroseCommandPalette";
import { NimroseFocusProvider, useNimroseFocus } from "./NimroseFocusContext";
import { NimrosePromptProvider } from "./NimrosePromptDialog";
import "./Nimrose.scss";

const COLLAPSE_KEY = "nimrose-sidebar-collapsed";
const BUILT_SECTIONS = ["home", "tasks", "calendar", "kanban", "projects", "notes", "focus", "browser"];

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const allSections = NIMROSE_SECTIONS.flatMap((s) => s.items);

const ComingSoonSection = ({ id }: { id: string }) => {
  const section = allSections.find((s) => s.id === id);
  return (
    <div className="nimrose-coming-soon glass-card">
      <p className="nimrose-eyebrow">Nimrose Desk</p>
      <h2 className="nimrose-page-title">{section?.label ?? id}</h2>
      <p className="nimrose-coming-soon-body">
        {section?.label} is planned for a later Nimrose phase. Home, Calendar, Tasks, Kanban,
        Notes and Focus are live — check back as the rest come online.
      </p>
    </div>
  );
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
  const { immersive } = useNimroseFocus();
  const isImmersiveFocus = active === "focus" && immersive;

  return (
    <div className={`nimrose-shell ${isImmersiveFocus ? "nimrose-shell--immersive" : ""}`}>
      {!isImmersiveFocus && (
        <NimroseSidebar active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      )}
      <main className="nimrose-workspace">
        {active === "home" && <NimroseHome />}
        {active === "tasks" && <NimroseTasksView />}
        {active === "calendar" && <NimroseCalendarView />}
        {(active === "kanban" || active === "projects") && <NimroseKanbanView />}
        {active === "notes" && <NimroseNotesView />}
        {active === "focus" && <NimroseFocusView />}
        {active === "browser" && <NimroseBrowserView />}
        {!BUILT_SECTIONS.includes(active) && <ComingSoonSection id={active} />}
      </main>
      {!isImmersiveFocus && <NimroseContextPanel />}
      <NimroseCommandPalette onNavigate={setActive} />
    </div>
  );
};

const NimroseShell = () => {
  const [active, setActive] = useState("home");
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
