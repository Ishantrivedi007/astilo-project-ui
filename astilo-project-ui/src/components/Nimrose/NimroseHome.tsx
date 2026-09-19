import { Reorder } from "framer-motion";
import { Plus } from "lucide-react";

import { useNimroseWidgets } from "./useNimroseWidgets";
import WidgetChrome from "./widgets/WidgetChrome";
import TodayWidget from "./widgets/TodayWidget";
import FocusTimerWidget from "./widgets/FocusTimerWidget";
import TasksWidget from "./widgets/TasksWidget";
import NotesWidget from "./widgets/NotesWidget";
import MusicWidget from "./widgets/MusicWidget";
import QuickLinksWidget from "./widgets/QuickLinksWidget";
import ComingSoonWidget from "./widgets/ComingSoonWidget";

const WIDGET_SPAN: Record<string, "sm" | "md" | "lg"> = {
  today: "sm",
  focus: "sm",
  tasks: "md",
  notes: "md",
  music: "sm",
  quickLinks: "lg",
  calendar: "sm",
  projects: "sm",
  browserTabs: "sm",
  notifications: "sm",
};

const renderWidgetBody = (id: string) => {
  switch (id) {
    case "today":
      return <TodayWidget />;
    case "focus":
      return <FocusTimerWidget />;
    case "tasks":
      return <TasksWidget />;
    case "notes":
      return <NotesWidget />;
    case "music":
      return <MusicWidget />;
    case "quickLinks":
      return <QuickLinksWidget />;
    case "calendar":
      return <ComingSoonWidget label="Calendar" />;
    case "projects":
      return <ComingSoonWidget label="Projects" />;
    case "browserTabs":
      return <ComingSoonWidget label="The built-in browser" />;
    case "notifications":
      return <ComingSoonWidget label="Notifications" />;
    default:
      return null;
  }
};

const NimroseHome = () => {
  const { widgetsById, visibleWidgets, hiddenWidgets, toggleHidden, reorder } = useNimroseWidgets();

  return (
    <div>
      <div className="nimrose-home-header">
        <div>
          <p className="nimrose-eyebrow">Workspace</p>
          <h1 className="nimrose-page-title">Home</h1>
        </div>
      </div>

      {visibleWidgets.length === 0 ? (
        <p className="nimrose-widget-empty">
          Every widget is hidden — bring one back from the list below.
        </p>
      ) : (
        <Reorder.Group
          as="div"
          axis="y"
          values={visibleWidgets}
          onReorder={reorder}
          className="nimrose-widget-grid"
        >
          {visibleWidgets.map((id) => (
            <Reorder.Item
              key={id}
              value={id}
              as="div"
              className={`nimrose-widget-slot nimrose-widget-slot--${WIDGET_SPAN[id] ?? "sm"}`}
            >
              <WidgetChrome title={widgetsById[id].label} span={WIDGET_SPAN[id]} onHide={() => toggleHidden(id)}>
                {renderWidgetBody(id)}
              </WidgetChrome>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {hiddenWidgets.length > 0 && (
        <div className="nimrose-hidden-widgets">
          <p className="nimrose-widget-footnote">Hidden widgets</p>
          <div className="nimrose-hidden-widget-chips">
            {hiddenWidgets.map((id) => (
              <button key={id} type="button" className="nimrose-chip" onClick={() => toggleHidden(id)}>
                <Plus size={12} /> {widgetsById[id].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NimroseHome;
