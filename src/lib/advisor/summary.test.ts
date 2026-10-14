import { expect, it } from "vitest";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { emptyPlan } from "@/lib/plan/types";
import { readyToWrapUp, requestedWrapUp, wrapUpSummary } from "./summary";

it("summarises accepted work, decimal totals, unpriced and unconverted lines honestly", () => {
  let plan = emptyPlan();
  const op = (value: PlanOp) => { const r = applyOp(plan, value, "user"); if (!r.ok) throw new Error(r.error); plan = r.plan; };
  expect(readyToWrapUp(plan)).toBe(false);
  op({ op: "add_objective", title: "Reliable service" });
  op({ op: "add_initiative", objectiveId: "o1", title: "Recovery", rationale: "Restore service", disposition: "fund" });
  op({ op: "add_line", initiativeId: "i2", title: "Restore test", category: "Support", quantity: 3, frequency: "one_off" });
  expect(readyToWrapUp(plan)).toBe(true);
  op({ op: "price_line", id: "l3", price: { unitPrice: "22761.67", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "Own estimate", capturedAt: "2026-10-14" } } });
  op({ op: "add_line", initiativeId: "i2", title: "Training", category: "Training", quantity: null, frequency: "one_off" });
  op({ op: "add_line", initiativeId: "i2", title: "Storage", category: "Hardware", quantity: 1, frequency: "one_off" });
  op({ op: "price_line", id: "l5", price: { unitPrice: "20.10", currency: "ZAR", evidence: { type: "USER_ESTIMATE", reference: "Own estimate", capturedAt: "2026-10-14" } } });
  const proposal = applyOp(plan, { op: "add_objective", title: "Later" }, "advisor");
  if (!proposal.ok) throw new Error("fixture");
  plan = proposal.plan;
  expect(wrapUpSummary(plan)).toBe("1 accepted objective, 1 accepted initiative, US$68,285.01 planned so far, 1 accepted line still to price. 1 line needs an exchange rate and is excluded from that total. 1 proposal awaits your decision.");
  expect(requestedWrapUp("Let's wrap up")).toBe(true);
  expect(requestedWrapUp("We want uptime")).toBe(false);
});

it("never presents an empty or wholly unpriced budget as a zero price", () => {
  expect(wrapUpSummary(emptyPlan())).toContain("No priced lines yet");
  const added=applyOp(emptyPlan(),{op:"add_line",initiativeId:null,title:"Power",category:"Hardware",quantity:1,frequency:"one_off"},"user");
  if(!added.ok)throw new Error(added.error);
  expect(wrapUpSummary(added.plan)).not.toContain("US$0");
  expect(wrapUpSummary(added.plan)).toContain("1 accepted line still to price");
});
