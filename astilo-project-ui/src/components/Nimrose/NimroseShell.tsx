import { useState } from "react";

import NimroseSidebar, { NIMROSE_SECTIONS } from "./NimroseSidebar";
import NimroseContextPanel from "./NimroseContextPanel";
import NimroseHome from "./NimroseHome";
import NimroseTasksView from "./NimroseTasksView";
import NimroseCalendarView from "./NimroseCalendarView";
import NimroseKanbanView from "./NimroseKanbanView";
import "./Nimrose.scss";

const COLLAPSE_KEY = "nimrose-sidebar-collapsed";

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
        {section?.label} is planned for a later Nimrose phase — Phase 1 ships the desk shell and
        the Home dashboard. Check back as Calendar, Tasks, Kanban and the rest come online.
      </p>
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
    <div className="nimrose-shell">
      <NimroseSidebar active={active} onSelect={setActive} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main className="nimrose-workspace">
        {active === "home" && <NimroseHome />}
        {active === "tasks" && <NimroseTasksView />}
        {active === "calendar" && <NimroseCalendarView />}
        {(active === "kanban" || active === "projects") && <NimroseKanbanView />}
        {!["home", "tasks", "calendar", "kanban", "projects"].includes(active) && <ComingSoonSection id={active} />}
      </main>
      <NimroseContextPanel />
    </div>
  );
};

export default NimroseShell;
