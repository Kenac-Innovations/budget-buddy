import { expect, it } from "vitest";
import { Plan } from "@/lib/plan/types";
import { planTotals } from "@/lib/plan/totals";
import { exportDemoPlan } from "./fixtures";
it("provides a validated, repeatable accepted demo with a priced kit, unpriced delivery and renewal", () => {
  const plan = Plan.parse(exportDemoPlan());
  expect(plan).toEqual(exportDemoPlan());
  expect(planTotals(plan).reportingTotal.toFixed(2)).toBe("49401.00");
  expect(planTotals(plan).unpricedLineIds).toEqual(["l6"]);
  expect(plan.lines.every((line) => !line.sharedWithKenac)).toBe(true);
});
