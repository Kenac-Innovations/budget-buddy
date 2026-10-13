import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Humaflow StatCard. Tone follows what the number means, never decoration. At most four in a row.
const TONES = {
  default: "bg-muted text-ink-2",
  primary: "bg-accent text-accent-foreground",
  success: "bg-green-bg text-green",
  warning: "bg-amber-bg text-amber",
  destructive: "bg-red-bg text-red",
} as const;

export function StatCard({
  icon: Icon,
  value,
  label,
  sub,
  tone = "default",
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  sub?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-5 py-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", TONES[tone])}>
        <Icon className="size-[19px]" strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <p className="text-page-title truncate">{value}</p>
        <p className="text-body-sm text-muted-foreground">{label}</p>
        {sub && <p className="text-caption text-muted-foreground opacity-70">{sub}</p>}
      </div>
    </div>
  );
}
