import type { ReactNode } from "react";
import { GripVertical, X } from "lucide-react";

interface WidgetChromeProps {
  title: string;
  span?: "sm" | "md" | "lg";
  onHide: () => void;
  children: ReactNode;
}

const WidgetChrome = ({ title, span = "sm", onHide, children }: WidgetChromeProps) => (
  <div className={`nimrose-widget nimrose-widget--${span} glass-card`}>
    <header className="nimrose-widget-header">
      <span className="nimrose-widget-drag" aria-hidden>
        <GripVertical size={14} />
      </span>
      <h3>{title}</h3>
      <button type="button" className="nimrose-widget-hide" onClick={onHide} aria-label={`Hide ${title}`}>
        <X size={14} />
      </button>
    </header>
    <div className="nimrose-widget-body">{children}</div>
  </div>
);

export default WidgetChrome;
