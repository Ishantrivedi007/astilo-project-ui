import type { ReactNode } from "react";

interface PageHeadingProps {
  eyebrow?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** The eyebrow + display title block used at the top of every page. */
const PageHeading = ({
  eyebrow,
  children,
  action,
  className,
}: PageHeadingProps) => (
  <div
    className={`mb-6 flex flex-wrap items-end justify-between gap-3 ${className ?? ""}`}
  >
    <div>
      {eyebrow && (
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent-2">
          {eyebrow}
        </p>
      )}
      <h1 className="section-heading text-ink">{children}</h1>
    </div>
    {action}
  </div>
);

export default PageHeading;
