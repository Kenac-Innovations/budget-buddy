import { calculateBudget, type BudgetLineInput, type BudgetResult } from "@/lib/budget/calculate";
import type { Plan } from "./types";

/**
 * Plan → calculation engine. Only accepted lines count towards the budget; proposed lines are
 * shown but not totalled until the CTO accepts them. Unpriced lines stay unpriced (never zero).
 */
export function planToEngineLines(plan: Plan): BudgetLineInput[] {
  return plan.lines
    .filter((l) => l.state === "accepted")
    .map((l) => ({
      id: l.id,
      currency: l.price?.currency ?? plan.profile.reportingCurrency,
      frequency: l.frequency,
      priceBasis: l.priceBasis,
      quantity: l.quantity,
      unitPrice: l.price?.unitPrice ?? null,
      paymentMonth: l.paymentMonth,
    }));
}

export function planTotals(plan: Plan): BudgetResult {
  return calculateBudget({
    period: { start: plan.profile.periodStart, end: plan.profile.periodEnd },
    reportingCurrency: plan.profile.reportingCurrency,
    lines: planToEngineLines(plan),
    // Exchange-rate assumptions are not captured in the beta; non-reporting-currency lines show as unconverted.
    rates: [],
  });
}
