import type { ReactNode } from "react";

interface GlassPanelProps {
  title?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Frosted card surface used for every panel in the app. */
const GlassPanel = ({
  title,
  action,
  subtitle,
  children,
  className,
  bodyClassName,
}: GlassPanelProps) => (
  <section className={`glass-card p-5 ${className ?? ""}`}>
    {(title || action) && (
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {title && (
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          )}
          {subtitle && <p className="text-xs text-ink/50">{subtitle}</p>}
        </div>
        {action}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default GlassPanel;
