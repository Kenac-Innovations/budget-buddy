import { describe, expect, it } from "vitest";
import { calculateBudget, calculateLine, type BudgetLineInput, type ExchangeRate } from "./calculate";

const FY = { start: "2027-01", end: "2027-12" };

function line(overrides: Partial<BudgetLineInput>): BudgetLineInput {
  return {
    id: "l1",
    currency: "USD",
    frequency: "one_off",
    priceBasis: "per_unit",
    quantity: 1,
    unitPrice: 100,
    ...overrides,
  };
}

describe("calculateLine", () => {
  it("multiplies per-unit price by quantity once for a one-off purchase", () => {
    const r = calculateLine(line({ quantity: 25, unitPrice: "849.99", paymentMonth: "2027-03" }), FY, "USD", []);
    expect(r.total?.toString()).toBe("21249.75");
    expect([...r.monthly.keys()]).toEqual(["2027-03"]);
  });

  it("does not multiply a bundle price by component quantity", () => {
    const r = calculateLine(line({ priceBasis: "bundle", quantity: 50, unitPrice: 1200 }), FY, "USD", []);
    expect(r.total?.toString()).toBe("1200");
  });

  it("charges monthly subscriptions only for active months inside the period", () => {
    const r = calculateLine(
      line({ frequency: "monthly", quantity: 40, unitPrice: "12.5", activeFrom: "2026-11", activeTo: "2027-06" }),
      FY,
      "USD",
      [],
    );
    expect(r.monthly.size).toBe(6);
    expect(r.total?.toString()).toBe("3000");
  });

  it("places an annual renewal in its payment month, anchored before the period", () => {
    const r = calculateLine(line({ frequency: "annual", unitPrice: 5000, paymentMonth: "2025-09" }), FY, "USD", []);
    expect([...r.monthly.keys()]).toEqual(["2027-09"]);
  });

  it("supports custom periods longer than a year", () => {
    const r = calculateLine(
      line({ frequency: "quarterly", unitPrice: 300, paymentMonth: "2027-01" }),
      { start: "2027-01", end: "2028-06" },
      "USD",
      [],
    );
    expect(r.monthly.size).toBe(6);
  });

  it("treats a missing price as unpriced, not zero", () => {
    const r = calculateLine(line({ unitPrice: null }), FY, "USD", []);
    expect(r.status).toBe("unpriced");
    expect(r.total).toBeNull();
  });

  it("treats a missing quantity on a per-unit line as unpriced", () => {
    const r = calculateLine(line({ quantity: null }), FY, "USD", []);
    expect(r.status).toBe("unpriced");
  });

  it("avoids floating-point drift", () => {
    const r = calculateLine(line({ frequency: "monthly", quantity: 3, unitPrice: "0.1" }), FY, "USD", []);
    expect(r.total?.toString()).toBe("3.6");
  });
});

describe("currency conversion", () => {
  const rates: ExchangeRate[] = [
    { from: "USD", to: "ZWG", rate: "26.8", effectiveFrom: "2027-01" },
    { from: "USD", to: "ZWG", rate: "30", effectiveFrom: "2027-07" },
  ];

  it("applies the rate effective in each payment month", () => {
    const r = calculateLine(line({ frequency: "monthly", unitPrice: 100 }), FY, "ZWG", rates);
    expect(r.reportingMonthly?.get("2027-01")?.toString()).toBe("2680");
    expect(r.reportingMonthly?.get("2027-07")?.toString()).toBe("3000");
    expect(r.total?.toString()).toBe("1200");
  });

  it("uses the inverse of a recorded pair", () => {
    const r = calculateLine(line({ currency: "ZWG", unitPrice: 2680, paymentMonth: "2027-02" }), FY, "USD", rates);
    expect(r.reportingTotal?.toString()).toBe("100");
  });

  it("marks a line unconverted rather than zero when a rate is missing", () => {
    const r = calculateLine(line({ currency: "ZAR", unitPrice: 1000, paymentMonth: "2027-02" }), FY, "USD", rates);
    expect(r.total?.toString()).toBe("1000");
    expect(r.reportingTotal).toBeNull();
    expect(r.unconvertedMonths).toEqual(["2027-02"]);
  });
});

describe("calculateBudget", () => {
  it("keeps original-currency totals separate and flags incomplete reporting totals", () => {
    const result = calculateBudget({
      period: FY,
      reportingCurrency: "USD",
      rates: [],
      lines: [
        line({ id: "laptops", quantity: 10, unitPrice: 900, paymentMonth: "2027-04" }),
        line({ id: "backup", unitPrice: null }),
        line({ id: "fibre", currency: "ZWG", frequency: "monthly", unitPrice: 5000 }),
      ],
    });
    expect(result.totalsByCurrency.get("USD")?.toString()).toBe("9000");
    expect(result.totalsByCurrency.get("ZWG")?.toString()).toBe("60000");
    expect(result.reportingTotal.toString()).toBe("9000");
    expect(result.unpricedLineIds).toEqual(["backup"]);
    expect(result.unconvertedLineIds).toEqual(["fibre"]);
    expect(result.complete).toBe(false);
  });

  it("reconciles monthly reporting amounts with the reporting total", () => {
    const result = calculateBudget({
      period: FY,
      reportingCurrency: "USD",
      rates: [],
      lines: [
        line({ id: "a", frequency: "monthly", quantity: 7, unitPrice: "3.333" }),
        line({ id: "b", frequency: "quarterly", unitPrice: "1000.005", paymentMonth: "2027-02" }),
      ],
    });
    const monthlySum = [...result.reportingMonthly.values()].reduce((a, b) => a.plus(b));
    expect(monthlySum.equals(result.reportingTotal)).toBe(true);
    expect(result.complete).toBe(true);
  });
});
