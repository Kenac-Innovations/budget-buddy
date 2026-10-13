import { Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Humaflow EmptyState. The title says what is missing; the next step is an outline button.
export function EmptyState({
  title,
  description,
  icon: Icon = Search,
  action,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" strokeWidth={1.7} />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
