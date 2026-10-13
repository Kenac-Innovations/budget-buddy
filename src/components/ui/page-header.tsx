import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Humaflow PageHeader. Title is the page's nav label; at most one primary action, placed last.
export function PageHeader({
  title,
  icon: Icon,
  meta,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-brand">
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-page-title text-ink">{title}</h1>
          {meta && <div className="text-body-sm text-ink-2">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
