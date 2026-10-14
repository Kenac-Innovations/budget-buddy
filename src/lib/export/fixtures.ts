import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import type { Plan } from "@/lib/plan/types";

/** Synthetic demo for golden tests, workbook review and the integration smoke script. */
export function exportDemoPlan(): Plan {
  let plan = scriptedTurn(1, scriptedTurn(0).plan).plan;
  function op(change: PlanOp) {
    const result = applyOp(plan, change, "user", new Date("2026-10-14T12:00:00Z"));
    if (!result.ok) throw new Error(result.error);
    plan = result.plan;
  }
  for (const id of ["o1", "o2", "i3", "i4", "l5", "l6", "l7"]) op({ op: "set_state", id, state: "accepted" });
  op({ op: "price_line", id: "l5", price: { unitPrice: "12000.125", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "Synthetic CIO estimate for demo only", capturedAt: "2026-10-14T12:00:00Z" } } });
  op({ op: "price_line", id: "l7", price: { unitPrice: "1400.50", currency: "USD", evidence: { type: "QUOTE", reference: "DEMO-Q-2026-10", capturedAt: "2026-10-13T12:00:00Z", validUntil: "2026-12-31T23:59:59Z", supplier: { name: "Demo supplier", isOperator: false } } } });
  return plan;
}
