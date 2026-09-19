import {
  Bookmark,
  Calendar,
  CheckSquare,
  ChevronsLeft,
  ChevronsRight,
  Focus,
  FolderKanban,
  Globe,
  Home,
  KanbanSquare,
  ListTodo,
  Notebook,
  Palette,
  Settings,
  Star,
} from "lucide-react";

export interface NimroseSection {
  id: string;
  label: string;
  icon: typeof Home;
}

const SECTIONS: { heading: string; items: NimroseSection[] }[] = [
  {
    heading: "Workspace",
    items: [
      { id: "home", label: "Home", icon: Home },
      { id: "calendar", label: "Calendar", icon: Calendar },
      { id: "tasks", label: "Tasks", icon: CheckSquare },
      { id: "kanban", label: "Kanban", icon: KanbanSquare },
      { id: "notes", label: "Notes", icon: Notebook },
      { id: "browser", label: "Browser", icon: Globe },
    ],
  },
  {
    heading: "Projects",
    items: [
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "sprints", label: "Sprints", icon: ListTodo },
      { id: "backlog", label: "Backlog", icon: ListTodo },
    ],
  },
  {
    heading: "Personal",
    items: [
      { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
      { id: "saved", label: "Saved", icon: Star },
      { id: "focus", label: "Focus", icon: Focus },
    ],
  },
  {
    heading: "System",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "themes", label: "Themes", icon: Palette },
    ],
  },
];

interface NimroseSidebarProps {
  active: string;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const NimroseSidebar = ({ active, onSelect, collapsed, onToggleCollapsed }: NimroseSidebarProps) => (
  <aside className={`nimrose-sidebar ${collapsed ? "nimrose-sidebar--collapsed" : ""}`}>
    <div className="nimrose-sidebar-scroll">
      {SECTIONS.map((section) => (
        <div key={section.heading} className="nimrose-sidebar-section">
          {!collapsed && <p className="nimrose-sidebar-heading">{section.heading}</p>}
          {section.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nimrose-sidebar-item ${active === item.id ? "nimrose-sidebar-item--active" : ""}`}
                onClick={() => onSelect(item.id)}
                title={item.label}
              >
                <Icon size={16} strokeWidth={2} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
    <button
      type="button"
      className="nimrose-sidebar-collapse"
      onClick={onToggleCollapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
    </button>
  </aside>
);

export default NimroseSidebar;
export { SECTIONS as NIMROSE_SECTIONS };
