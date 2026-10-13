import type { BudgetLineInput, ExchangeRate, PlanningPeriod } from "./calculate";
import type { EVIDENCE_STATUS } from "@/components/ui/status-pill";

/**
 * Illustrative budget used until persistence is wired. Organisation, prices and the
 * exchange rate are examples, not real quotes or an official rate.
 */

export interface SampleLine extends BudgetLineInput {
  title: string;
  category: string;
  evidence: keyof typeof EVIDENCE_STATUS;
  supplier?: { name: string; isOperator: boolean };
  timing: string;
}

export const sampleBudget = {
  organisation: "Example Holdings Ltd",
  name: "ICT budget 2027",
  status: "DRAFT" as const,
  period: { start: "2027-01", end: "2027-12" } satisfies PlanningPeriod,
  reportingCurrency: "USD",
  ceilingUsd: 120_000,
  rates: [{ from: "USD", to: "ZWG", rate: "26.8", effectiveFrom: "2027-01" }] satisfies ExchangeRate[],
};

const kenac = { name: "Kenac Computer Systems", isOperator: true };

export const sampleLines: SampleLine[] = [
  {
    id: "laptops",
    title: "Laptop replacement (25 units)",
    category: "Hardware",
    currency: "USD",
    frequency: "one_off",
    priceBasis: "per_unit",
    quantity: 25,
    unitPrice: "1149.00",
    paymentMonth: "2027-03",
    evidence: "OPERATOR_PRICE_LIST",
    supplier: kenac,
    timing: "March",
  },
  {
    id: "m365",
    title: "Microsoft 365 Business Standard",
    category: "Software and subscriptions",
    currency: "USD",
    frequency: "monthly",
    priceBasis: "per_unit",
    quantity: 140,
    unitPrice: "12.50",
    evidence: "PUBLISHED_PRICE",
    timing: "Monthly",
  },
  {
    id: "fibre",
    title: "Head office fibre, 100 Mbps",
    category: "Connectivity",
    currency: "ZWG",
    frequency: "monthly",
    priceBasis: "bundle",
    quantity: 1,
    unitPrice: "21440.00",
    evidence: "CONTRACT",
    timing: "Monthly",
  },
  {
    id: "firewall",
    title: "Firewall subscription renewal",
    category: "Cybersecurity",
    currency: "USD",
    frequency: "annual",
    priceBasis: "bundle",
    quantity: 1,
    unitPrice: "6800.00",
    paymentMonth: "2026-08",
    evidence: "QUOTE",
    supplier: kenac,
    timing: "August",
  },
  {
    id: "ups",
    title: "UPS battery replacement",
    category: "Support and maintenance",
    currency: "USD",
    frequency: "one_off",
    priceBasis: "per_unit",
    quantity: 12,
    unitPrice: "180.00",
    paymentMonth: "2027-05",
    evidence: "USER_ESTIMATE",
    timing: "May",
  },
  {
    id: "backup",
    title: "Backup implementation and recovery testing",
    category: "Strategic projects",
    currency: "USD",
    frequency: "one_off",
    priceBasis: "bundle",
    quantity: 1,
    unitPrice: null,
    paymentMonth: "2027-04",
    evidence: "UNPRICED",
    timing: "April",
  },
];
