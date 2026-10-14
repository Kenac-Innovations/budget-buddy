import Decimal from "decimal.js";
import { applyOp } from "@/lib/plan/ops";
import { planTotals } from "@/lib/plan/totals";
import type { Plan, PlanLine } from "@/lib/plan/types";
import { formatMonth } from "../dates";

/** A view-only selection. All persisted changes still pass through applyOp. */
export function deriveHud(plan: Plan) {
  const deferred = new Set(plan.initiatives.filter(i => i.state === "accepted" && i.disposition === "defer").map(i => i.id));
  const view = { ...plan, lines: plan.lines.filter(l => !l.initiativeId || !deferred.has(l.initiativeId)) };
  const totals = planTotals(view);
  const baseline = planTotals(plan);
  const active = view.lines.filter(l => l.state !== "dismissed");
  const preview = active.filter(l => l.state === "proposed").reduce((current, line) => {
    const result = applyOp(current, { op: "set_state", id: line.id, state: "accepted" }, "user");
    return result.ok ? result.plan : current;
  }, view);
  const lineTotals = new Map(planTotals(preview).lines.map(l => [l.id, l]));
  // Category/objective sums are separate engine selections, never a second money engine.
  const categories = [...new Set(plan.lines.map(l => l.category))].sort().map(category => ({
    category, total: planTotals({ ...view, lines: view.lines.filter(l => l.category === category) }).reportingTotal,
    hasAmount: totals.lines.some(l => view.lines.find(v => v.id === l.id)?.category === category && l.reportingTotal !== null),
  }));
  const objectives = new Map(plan.objectives.map(o => [o.id, planTotals({ ...view, lines: view.lines.filter(l =>
    plan.initiatives.some(i => i.id === l.initiativeId && i.objectiveId === o.id)) }).reportingTotal]));
  const unpriced = active.filter(l => !l.price || lineTotals.get(l.id)?.status === "unpriced").length;
  return { view, totals, categories, objectives, lineTotals, deferred, unpriced,
    priced: active.length - unpriced, count: active.length,
    complete: totals.complete && unpriced === 0 && active.length > 0,
    baselineComplete: baseline.complete,
    hasBaselineAmount: baseline.lines.some(l => l.reportingTotal !== null),
    savings: baseline.reportingTotal.minus(totals.reportingTotal) };
}
export type Hud = ReturnType<typeof deriveHud>;

export function pathIds(plan: Plan, id: string): Set<string> {
  const line = plan.lines.find(l => l.id === id);
  const initiative = plan.initiatives.find(i => i.id === (line?.initiativeId ?? id));
  const objectiveId = initiative?.objectiveId ?? id;
  const initiatives = plan.initiatives.filter(i => i.objectiveId === objectiveId &&
    (!initiative || i.id === initiative.id));
  return new Set([id, objectiveId, ...initiatives.map(i => i.id), ...plan.lines.filter(l =>
    line ? l.id === line.id : initiatives.some(i => i.id === l.initiativeId)).map(l => l.id)]);
}
export function categoryIllustration(category: string) {
  const key = category.toLowerCase();
  const match = [
    ["server", "servers"], ["network", "networking"], ["connect", "connectivity"],
    ["power", "power"], ["cyber", "cybersecurity"], ["security", "cybersecurity"], ["cloud", "cloud"],
    ["software", "software"], ["licen", "software"], ["professional", "services"], ["train", "training"],
    ["support", "support"], ["maintenance", "support"],
  ].find(([term]) => key.includes(term));
  return `/illustrations/categories/${match?.[1] ?? "hardware"}.svg`;
}
export function quoteRequest(line: PlanLine, periodStart: string) {
  return `Please quote for ${line.title}.\nQuantity: ${line.quantity ?? "To confirm"} ${line.unit ?? "units"}.\nTiming: ${formatMonth(line.paymentMonth ?? periodStart)}; ${line.frequency.replaceAll("_", " ")}.\nSpecification: ${line.note ?? "Please confirm specifications and scope."}\nPlease state validity, delivery, implementation, support and taxes separately.`;
}
export function sharePercent(amount: Decimal, total: Decimal) {
  return total.isZero() ? "0" : amount.div(total).times(100).toFixed(0);
}
