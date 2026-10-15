import type { Plan } from "@/lib/plan/types";

/**
 * Deterministic list of what still stops the plan being a defensible budget. Computed by the
 * server each turn and given to the advisor as data, so budget depth doesn't depend on the model
 * noticing gaps itself. Ordered by importance; dismissed items are ignored.
 */
export interface PlanGap {
  id: string;
  kind:
    | "objective_measure"
    | "objective_timing"
    | "initiative_without_lines"
    | "line_quantity"
    | "line_timing"
    | "no_recurring_cost"
    | "unpriced";
  text: string;
}

const RECURRING = new Set(["monthly", "quarterly", "annual"]);
// A deadline: a year, a quarter or a month name. Frequency words ("a month") do not count.
const HAS_DATE = /\b(20\d\d|q[1-4]|(first|second|third|fourth) quarter|jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)\b/i;

export function planGaps(plan: Plan): PlanGap[] {
  const gaps: PlanGap[] = [];
  const objectives = plan.objectives.filter((o) => o.state !== "dismissed");
  const initiatives = plan.initiatives.filter((i) => i.state !== "dismissed");
  const lines = plan.lines.filter((l) => l.state !== "dismissed");

  for (const o of objectives) {
    if (!o.measure) gaps.push({ id: o.id, kind: "objective_measure", text: `Objective "${o.title}" has no measurable success target.` });
    else if (!HAS_DATE.test(`${o.title} ${o.measure}`)) gaps.push({ id: o.id, kind: "objective_timing", text: `Objective "${o.title}" has no needed-by date or quarter.` });
  }
  for (const i of initiatives) {
    const own = lines.filter((l) => l.initiativeId === i.id);
    if (own.length === 0) {
      gaps.push({ id: i.id, kind: "initiative_without_lines", text: `Initiative "${i.title}" has no budget lines yet.` });
    } else if (i.disposition === "fund" && !own.some((l) => RECURRING.has(l.frequency))) {
      gaps.push({ id: i.id, kind: "no_recurring_cost", text: `Initiative "${i.title}" has no recurring cost (support, subscription, maintenance or renewal).` });
    }
  }
  for (const l of lines) {
    if (l.quantity === null && l.priceBasis !== "bundle") gaps.push({ id: l.id, kind: "line_quantity", text: `Line "${l.title}" has no quantity.` });
    if (!l.paymentMonth) gaps.push({ id: l.id, kind: "line_timing", text: `Line "${l.title}" has no payment month.` });
  }
  const unpriced = lines.filter((l) => !l.price).length;
  if (unpriced > 0) gaps.push({ id: "prices", kind: "unpriced", text: `${unpriced} line(s) are Unpriced and need a dated quote, published price or the user's own estimate.` });
  return gaps;
}

/** Compact form for the model's context: the most important gaps first, capped. */
export function gapsForPrompt(plan: Plan, max = 8): string {
  const gaps = planGaps(plan);
  if (gaps.length === 0) return "Open gaps: none.";
  const shown = gaps.slice(0, max).map((g) => `- [${g.kind} ${g.id}] ${g.text}`).join("\n");
  return `Open gaps (data, most important first${gaps.length > max ? `; ${gaps.length - max} more` : ""}):\n${shown}`;
}
