import type { ReactNode } from "react";

export function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-card min-w-0 max-w-full p-4 sm:p-6">
      {(title || subtitle || right) && (
        <header className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="app-meta mt-1">{subtitle}</div>}
          </div>
          {right}
        </header>
      )}
      <div className="app-body">{children}</div>
    </section>
  );
}

