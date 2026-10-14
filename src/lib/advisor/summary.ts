import type { Plan } from "@/lib/plan/types";
import { planTotals } from "@/lib/plan/totals";

export function readyToWrapUp(plan: Plan): boolean {
  const objectives = plan.objectives.filter((o) => o.state === "accepted");
  return objectives.length > 0 && objectives.every((o) => {
    const initiatives = plan.initiatives.filter((i) => i.objectiveId === o.id && i.state === "accepted");
    return initiatives.length > 0 && initiatives.every((i) =>
      plan.lines.some((l) => l.initiativeId === i.id && l.state === "accepted"));
  });
}

export function requestedWrapUp(message: string): boolean {
  return /\b(wrap\s*(up)?|finish|save\s+(this|it|my|the)\s*(plan)?|done\s+for\s+(now|today))\b/i.test(message);
}

/** All money is formatted directly from the decimal engine; never converted to a float. */
export function wrapUpSummary(plan: Plan): string {
  const totals = planTotals(plan);
  const count = (n: number, singular: string) => `${n} ${singular}${n === 1 ? "" : "s"}`;
  const [whole, fraction] = totals.reportingTotal.toFixed(2).split(".");
  const money = `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
  const currency = totals.reportingCurrency === "USD" ? "US$" : `${totals.reportingCurrency} `;
  const accepted = (items: { state: string }[]) => items.filter((i) => i.state === "accepted").length;
  const pending = [...plan.objectives, ...plan.initiatives, ...plan.lines].filter((i) => i.state === "proposed").length;
  return `${count(accepted(plan.objectives), "accepted objective")}, ${count(accepted(plan.initiatives), "accepted initiative")}, ${currency}${money} planned so far, ${count(totals.unpricedLineIds.length, "accepted line")} still to price.` +
    (totals.unconvertedLineIds.length ? ` ${count(totals.unconvertedLineIds.length, "line")} ${totals.unconvertedLineIds.length === 1 ? "needs an exchange rate and is" : "need an exchange rate and are"} excluded from that total.` : "") +
    (pending ? ` ${count(pending, "proposal")} ${pending === 1 ? "awaits" : "await"} your decision.` : "");
}
