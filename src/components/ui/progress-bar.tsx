import { cn } from "@/lib/utils";

// Humaflow ProgressBar. The fill takes a status colour, never the brand (navy is for charts).
const FILL = {
  green: "bg-green",
  amber: "bg-amber",
  red: "bg-red",
  grey: "bg-grey",
  slate: "bg-slate",
} as const;

export function ProgressBar({
  value,
  tone,
  label,
  showPct = true,
}: {
  value: number;
  tone: keyof typeof FILL;
  label: string;
  showPct?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-600", FILL[tone])} style={{ width: `${pct}%` }} />
      </div>
      {showPct && <span className="text-meta w-10 text-right text-ink-2">{Math.round(pct)}%</span>}
    </div>
  );
}
