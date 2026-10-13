import Decimal from "decimal.js";

/**
 * Deterministic budget calculation engine (spec §11).
 *
 * Rules implemented here:
 * - Whole-month granularity. No prorating: partial-period policy is an open decision.
 * - Per-unit: quantity × unit price per occurrence. Bundle: price × bundle count;
 *   quantity is informational and never multiplies a bundle price.
 * - Cash basis: amounts land in the month they are paid, not the month of coverage.
 * - A missing price is "unpriced", never zero. A missing rate is "unconverted", never zero.
 * - Each occurrence is rounded to the currency's minor unit (half-up) before summing,
 *   so the monthly view and the totals always reconcile.
 * - Tax is not applied yet: lines carry a tax assumption but the engine does not price it.
 */

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/** "YYYY-MM" */
export type Month = string;

export type Frequency = "one_off" | "monthly" | "quarterly" | "annual" | "schedule";

export interface BudgetLineInput {
  id: string;
  currency: string;
  frequency: Frequency;
  priceBasis: "per_unit" | "bundle";
  /** Null means "not known yet". */
  quantity: Decimal.Value | null;
  /** Null means unpriced. */
  unitPrice: Decimal.Value | null;
  /** Bundle basis only; defaults to 1. */
  bundleCount?: number;
  /** First and last month the line is active. Defaults to the planning period. */
  activeFrom?: Month;
  activeTo?: Month;
  /** First payment month for one-off/quarterly/annual. Defaults to activeFrom. */
  paymentMonth?: Month;
  /** Explicit payments for frequency "schedule"; amounts are taken as-is. */
  schedule?: { month: Month; amount: Decimal.Value }[];
}

export interface PlanningPeriod {
  start: Month;
  end: Month;
}

export interface ExchangeRate {
  /** 1 unit of `from` = `rate` units of `to`. */
  from: string;
  to: string;
  rate: Decimal.Value;
  /** Applies from this month until superseded by a later entry. */
  effectiveFrom: Month;
}

export interface LineResult {
  id: string;
  currency: string;
  status: "priced" | "unpriced";
  /** Original-currency amounts by month; empty when unpriced. */
  monthly: Map<Month, Decimal>;
  total: Decimal | null;
  /** Reporting-currency amounts; null when unpriced or any month lacks a rate. */
  reportingMonthly: Map<Month, Decimal> | null;
  reportingTotal: Decimal | null;
  /** Months with a payment but no applicable rate. */
  unconvertedMonths: Month[];
}

export interface BudgetResult {
  reportingCurrency: string;
  months: Month[];
  lines: LineResult[];
  /** Original-currency totals, kept separate per currency. */
  totalsByCurrency: Map<string, Decimal>;
  /** Sum of converted lines only. Read alongside `complete`. */
  reportingTotal: Decimal;
  reportingMonthly: Map<Month, Decimal>;
  unpricedLineIds: string[];
  unconvertedLineIds: string[];
  /** False when any line is unpriced or unconverted: the reporting total is a floor. */
  complete: boolean;
}

const MINOR_UNITS: Record<string, number> = { USD: 2, ZWG: 2, ZAR: 2, EUR: 2, GBP: 2 };

export function roundMoney(amount: Decimal, currency: string): Decimal {
  return amount.toDecimalPlaces(MINOR_UNITS[currency] ?? 2, Decimal.ROUND_HALF_UP);
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthIndex(m: Month): number {
  if (!MONTH_RE.test(m)) throw new Error(`Invalid month "${m}", expected YYYY-MM`);
  const [y, mo] = m.split("-").map(Number);
  return y * 12 + (mo - 1);
}

function monthFromIndex(i: number): Month {
  const y = Math.floor(i / 12);
  const mo = (i % 12) + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

export function monthsBetween(start: Month, end: Month): Month[] {
  const a = monthIndex(start);
  const b = monthIndex(end);
  if (b < a) throw new Error(`Period end ${end} is before start ${start}`);
  return Array.from({ length: b - a + 1 }, (_, k) => monthFromIndex(a + k));
}

function occurrenceAmount(line: BudgetLineInput): Decimal | null {
  if (line.unitPrice === null) return null;
  const price = new Decimal(line.unitPrice);
  if (line.priceBasis === "bundle") return price.times(line.bundleCount ?? 1);
  if (line.quantity === null) return null;
  return price.times(line.quantity);
}

function paymentMonths(line: BudgetLineInput, period: PlanningPeriod): Month[] {
  const from = monthIndex(line.activeFrom ?? period.start);
  const to = monthIndex(line.activeTo ?? period.end);
  const pStart = monthIndex(period.start);
  const pEnd = monthIndex(period.end);
  const anchor = monthIndex(line.paymentMonth ?? line.activeFrom ?? period.start);
  const step = { one_off: 0, monthly: 1, quarterly: 3, annual: 12 }[
    line.frequency as Exclude<Frequency, "schedule">
  ];

  const out: Month[] = [];
  if (step === 0) {
    if (anchor >= pStart && anchor <= pEnd) out.push(monthFromIndex(anchor));
    return out;
  }
  for (let i = anchor; i <= Math.min(to, pEnd); i += step) {
    if (i >= Math.max(from, pStart)) out.push(monthFromIndex(i));
  }
  return out;
}

export function findRate(
  rates: ExchangeRate[],
  from: string,
  to: string,
  month: Month,
): Decimal | null {
  if (from === to) return new Decimal(1);
  const m = monthIndex(month);
  let best: { idx: number; rate: Decimal } | null = null;
  for (const r of rates) {
    const idx = monthIndex(r.effectiveFrom);
    if (idx > m) continue;
    let rate: Decimal | null = null;
    if (r.from === from && r.to === to) rate = new Decimal(r.rate);
    else if (r.from === to && r.to === from) rate = new Decimal(1).dividedBy(r.rate);
    if (rate && (!best || idx >= best.idx)) best = { idx, rate };
  }
  return best?.rate ?? null;
}

export function calculateLine(
  line: BudgetLineInput,
  period: PlanningPeriod,
  reportingCurrency: string,
  rates: ExchangeRate[],
): LineResult {
  const monthly = new Map<Month, Decimal>();
  const months = new Set(monthsBetween(period.start, period.end));

  if (line.frequency === "schedule") {
    for (const p of line.schedule ?? []) {
      if (!months.has(p.month)) continue;
      const prev = monthly.get(p.month) ?? new Decimal(0);
      monthly.set(p.month, prev.plus(roundMoney(new Decimal(p.amount), line.currency)));
    }
  } else {
    const amount = occurrenceAmount(line);
    if (amount === null) {
      return {
        id: line.id,
        currency: line.currency,
        status: "unpriced",
        monthly,
        total: null,
        reportingMonthly: null,
        reportingTotal: null,
        unconvertedMonths: [],
      };
    }
    const rounded = roundMoney(amount, line.currency);
    for (const m of paymentMonths(line, period)) monthly.set(m, rounded);
  }

  const total = [...monthly.values()].reduce((a, b) => a.plus(b), new Decimal(0));

  const reportingMonthly = new Map<Month, Decimal>();
  const unconvertedMonths: Month[] = [];
  for (const [m, amt] of monthly) {
    const rate = findRate(rates, line.currency, reportingCurrency, m);
    if (rate === null) unconvertedMonths.push(m);
    else reportingMonthly.set(m, roundMoney(amt.times(rate), reportingCurrency));
  }
  const converted = unconvertedMonths.length === 0;

  return {
    id: line.id,
    currency: line.currency,
    status: "priced",
    monthly,
    total,
    reportingMonthly: converted ? reportingMonthly : null,
    reportingTotal: converted
      ? [...reportingMonthly.values()].reduce((a, b) => a.plus(b), new Decimal(0))
      : null,
    unconvertedMonths,
  };
}

export function calculateBudget(input: {
  period: PlanningPeriod;
  reportingCurrency: string;
  lines: BudgetLineInput[];
  rates: ExchangeRate[];
}): BudgetResult {
  const months = monthsBetween(input.period.start, input.period.end);
  const lines = input.lines.map((l) =>
    calculateLine(l, input.period, input.reportingCurrency, input.rates),
  );

  const totalsByCurrency = new Map<string, Decimal>();
  const reportingMonthly = new Map<Month, Decimal>(months.map((m) => [m, new Decimal(0)]));
  let reportingTotal = new Decimal(0);

  for (const l of lines) {
    if (l.total) {
      totalsByCurrency.set(l.currency, (totalsByCurrency.get(l.currency) ?? new Decimal(0)).plus(l.total));
    }
    if (l.reportingMonthly && l.reportingTotal) {
      reportingTotal = reportingTotal.plus(l.reportingTotal);
      for (const [m, amt] of l.reportingMonthly) {
        reportingMonthly.set(m, reportingMonthly.get(m)!.plus(amt));
      }
    }
  }

  const unpricedLineIds = lines.filter((l) => l.status === "unpriced").map((l) => l.id);
  const unconvertedLineIds = lines.filter((l) => l.unconvertedMonths.length > 0).map((l) => l.id);

  return {
    reportingCurrency: input.reportingCurrency,
    months,
    lines,
    totalsByCurrency,
    reportingTotal,
    reportingMonthly,
    unpricedLineIds,
    unconvertedLineIds,
    complete: unpricedLineIds.length === 0 && unconvertedLineIds.length === 0,
  };
}
