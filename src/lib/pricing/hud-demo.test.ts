import { expect, it } from "vitest";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { applyOp } from "@/lib/plan/ops";
import { planTotals } from "@/lib/plan/totals";
import { catalogueDisplay } from "./catalogue-display";

it("keeps solar and real Kenac families unpriced and excluded from accepted spend", () => {
  const turn = scriptedTurn(1, scriptedTurn(0, undefined, true).plan, true);
  let plan = turn.plan;
  const selected = plan.lines.filter(line => line.category === "Power" || catalogueDisplay(line));
  expect(selected).toHaveLength(4);
  for (const line of selected) {
    expect(line.price).toBeNull();
    const accepted = applyOp(plan, { op: "set_state", id: line.id, state: "accepted" }, "user");
    if (!accepted.ok) throw new Error(accepted.error);
    plan = accepted.plan;
  }
  expect(planTotals(plan).reportingTotal.toFixed()).toBe("0");
  expect(planTotals(plan).unpricedLineIds).toHaveLength(4);
  const solar = plan.lines.find(line => line.category === "Power")!;
  expect(catalogueDisplay(solar)).toBeNull();
  expect(turn.events.filter(event => event.type === "text").map(event => event.delta).join(""))
    .toContain("quotes from power suppliers");
  for (const line of plan.lines.filter(line => line.price)) {
    expect(line.price?.evidence.reference).toBe("Demo price list · not real prices");
  }
});
