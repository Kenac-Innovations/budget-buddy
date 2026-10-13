import { cn } from "@/lib/utils";

/**
 * Humaflow StatusPill with Budget Buddy's fixed status vocabulary.
 * Labels come from these maps; never pass custom text. The dot plus the word carries
 * the meaning, because the light-mode pill colours are below 4.5:1.
 */

type Tone = "green" | "amber" | "red" | "grey" | "slate";

const TONE: Record<Tone, string> = {
  green: "bg-green-bg text-green",
  amber: "bg-amber-bg text-amber",
  red: "bg-red-bg text-red",
  grey: "bg-grey-bg text-grey",
  slate: "bg-slate-bg text-slate",
};

export const BUDGET_STATUS = {
  DRAFT: { label: "Draft", tone: "grey" },
  SUBMITTED: { label: "Submitted", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

/** Evidence strength: documented commitments are green, an own estimate is amber, missing is red. */
export const EVIDENCE_STATUS = {
  CONTRACT: { label: "Contract", tone: "green" },
  QUOTE: { label: "Quote", tone: "green" },
  OPERATOR_PRICE_LIST: { label: "Kenac price list", tone: "slate" },
  PUBLISHED_PRICE: { label: "Published price", tone: "slate" },
  HISTORICAL_ACTUAL: { label: "Past spend", tone: "slate" },
  USER_ESTIMATE: { label: "Own estimate", tone: "amber" },
  UNPRICED: { label: "Unpriced", tone: "red" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export const SHARING_STATUS = {
  PRIVATE: { label: "Private", tone: "grey" },
  IDENTIFIED: { label: "Shared with Kenac", tone: "slate" },
} as const satisfies Record<string, { label: string; tone: Tone }>;

type StatusMap = Record<string, { label: string; tone: Tone }>;

export function StatusPill<M extends StatusMap>({
  map,
  status,
  size = "md",
  className,
}: {
  map: M;
  status: keyof M;
  size?: "md" | "sm";
  className?: string;
}) {
  const { label, tone } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "md" ? "px-3 py-1 text-[12.5px]" : "px-[9px] py-[3px] text-[11.5px]",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className="size-[7px] rounded-full bg-current" />
      {label}
    </span>
  );
}
