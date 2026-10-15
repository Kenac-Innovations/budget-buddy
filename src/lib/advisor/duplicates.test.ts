import { describe, expect, it } from "vitest";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { emptyPlan, type Plan } from "@/lib/plan/types";
import { duplicateOf, similar } from "./duplicates";

function build(ops: PlanOp[]): Plan {
  return ops.reduce((plan, op) => { const r = applyOp(plan, op, "advisor"); if (!r.ok) throw new Error(r.error); return r.plan; }, emptyPlan());
}

describe("duplicate guard", () => {
  it("treats rephrasings of the same item as duplicates", () => {
    expect(similar("Recovery readiness assessment", "Assessment of recovery readiness")).toBe(true);
    expect(similar("Branch backup power assessment", "Backup power assessment")).toBe(true);
  });
  it("keeps genuinely different items apart", () => {
    expect(similar("Backup power assessment", "Connectivity redundancy")).toBe(false);
    expect(similar("UPS units", "UPS installation")).toBe(false);
  });
  it("only compares within the same parent and ignores set-aside items", () => {
    let plan = build([
      { op: "add_objective", title: "Cut outages" },
      { op: "add_initiative", objectiveId: "o1", title: "Backup power assessment", disposition: "investigate", rationale: "r" },
    ]);
    expect(duplicateOf(plan, { op: "add_initiative", objectiveId: "o1", title: "Assessment of backup power" })?.id).toBe("i2");
    expect(duplicateOf(plan, { op: "add_initiative", objectiveId: "o9", title: "Assessment of backup power" })).toBeNull();
    const r = applyOp(plan, { op: "set_state", id: "i2", state: "dismissed" }, "user");
    if (!r.ok) throw new Error(r.error);
    plan = r.plan;
    expect(duplicateOf(plan, { op: "add_initiative", objectiveId: "o1", title: "Assessment of backup power" })).toBeNull();
  });
});
