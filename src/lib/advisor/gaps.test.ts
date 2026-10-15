import { describe, expect, it } from "vitest";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { emptyPlan, type Plan } from "@/lib/plan/types";
import { gapsForPrompt, planGaps } from "./gaps";

function build(ops: PlanOp[]): Plan {
  return ops.reduce((plan, op) => {
    const r = applyOp(plan, op, "advisor");
    if (!r.ok) throw new Error(r.error);
    return r.plan;
  }, emptyPlan());
}

describe("plan gaps", () => {
  it("lists missing measures, lines, quantities, timing and recurring costs", () => {
    const plan = build([
      { op: "add_objective", title: "Cut outages" },
      { op: "add_initiative", objectiveId: "o1", title: "Backup power", disposition: "fund", rationale: "r" },
      { op: "add_initiative", objectiveId: "o1", title: "Assess load", disposition: "investigate", rationale: "r" },
      { op: "add_line", initiativeId: "i2", title: "UPS units", category: "Power", quantity: null, frequency: "one_off" },
    ]);
    const kinds = planGaps(plan).map((g) => `${g.kind}:${g.id}`);
    expect(kinds).toContain("objective_measure:o1");
    expect(kinds).toContain("initiative_without_lines:i3");
    expect(kinds).toContain("no_recurring_cost:i2");
    expect(kinds).toContain("line_quantity:l4");
    expect(kinds).toContain("line_timing:l4");
    expect(kinds).toContain("unpriced:prices");
  });

  it("asks for timing when a measure has no date", () => {
    const plan = build([{ op: "add_objective", title: "Cut outages", measure: "Downtime under 4 hours a month" }]);
    expect(planGaps(plan).map((g) => g.kind)).toContain("objective_timing");
    const dated = build([{ op: "add_objective", title: "Open branches", measure: "All four trading by Q3 2027" }]);
    expect(planGaps(dated).map((g) => g.kind)).not.toContain("objective_timing");
  });

  it("ignores items the user set aside", () => {
    let plan = build([{ op: "add_objective", title: "Cut outages" }]);
    const r = applyOp(plan, { op: "set_state", id: "o1", state: "dismissed" }, "user");
    if (!r.ok) throw new Error(r.error);
    plan = r.plan;
    expect(planGaps(plan)).toHaveLength(0);
    expect(gapsForPrompt(plan)).toBe("Open gaps: none.");
  });
});
