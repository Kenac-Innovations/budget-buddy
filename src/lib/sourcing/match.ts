import Decimal from "decimal.js";
import { checkPriceEvidence, type PriceEvidence } from "./evidence";

/**
 * Offer matching with operator-first ordering (docs/decisions.md D2).
 *
 * Order of precedence:
 *   1. Fit to the requirement. An offer that fails a stated constraint is excluded,
 *      whoever supplies it. A full fit always outranks a partial (unverified) fit.
 *   2. Within the same fit level, Kenac (the operator) ranks first.
 *   3. Then offers with a usable sourced price, cheapest first within the same currency.
 *
 * External sourcing is needed only when Kenac has no full-fit offer, unless the buyer
 * must obtain competing quotes (public entities) or asks for alternatives.
 */

export type AttributeValue = string | number | boolean;

export type Constraint =
  | { key: string; op: "eq"; value: AttributeValue }
  | { key: string; op: "gte" | "lte"; value: number }
  | { key: string; op: "in"; value: AttributeValue[] };

export interface Requirement {
  category: string;
  constraints: Constraint[];
  quantity?: number;
}

export interface Offer {
  supplierId: string;
  supplierName: string;
  isOperator: boolean;
  sku: string;
  name: string;
  category: string;
  attributes: Record<string, AttributeValue>;
  price: PriceEvidence | null;
}

export type ConstraintResult = "met" | "unmet" | "unknown";
export type Fit = "full" | "partial";

export interface RankedOffer {
  offer: Offer;
  fit: Fit;
  constraintResults: { constraint: Constraint; result: ConstraintResult }[];
  /** Null when the price is missing, expired, or otherwise unusable. */
  usablePrice: Decimal | null;
  priceIssue: string | null;
  /** Plain-language reasons for this position, shown to the user. */
  reasons: string[];
}

export interface MatchResult {
  ranked: RankedOffer[];
  excluded: { offer: Offer; unmet: Constraint[] }[];
  operatorCanSupply: boolean;
  /** True when the buyer should be shown non-Kenac options. */
  needsExternalOptions: boolean;
}

export function evaluateConstraint(c: Constraint, attrs: Record<string, AttributeValue>): ConstraintResult {
  if (!(c.key in attrs)) return "unknown";
  const v = attrs[c.key];
  switch (c.op) {
    case "eq":
      return norm(v) === norm(c.value) ? "met" : "unmet";
    case "in":
      return c.value.map(norm).includes(norm(v)) ? "met" : "unmet";
    case "gte":
    case "lte": {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isNaN(n)) return "unknown";
      return (c.op === "gte" ? n >= c.value : n <= c.value) ? "met" : "unmet";
    }
  }
}

function norm(v: AttributeValue): string {
  return String(v).trim().toLowerCase();
}

function describe(c: Constraint): string {
  const op = { eq: "=", gte: "≥", lte: "≤", in: "in" }[c.op];
  return `${c.key} ${op} ${Array.isArray(c.value) ? c.value.join("/") : c.value}`;
}

export function matchOffers(
  req: Requirement,
  offers: Offer[],
  opts: { asOf: Date; currency: string; requireCompetingQuotes?: boolean },
): MatchResult {
  const ranked: RankedOffer[] = [];
  const excluded: MatchResult["excluded"] = [];

  for (const offer of offers) {
    if (norm(offer.category) !== norm(req.category)) continue;
    const constraintResults = req.constraints.map((constraint) => ({
      constraint,
      result: evaluateConstraint(constraint, offer.attributes),
    }));
    const unmet = constraintResults.filter((r) => r.result === "unmet").map((r) => r.constraint);
    if (unmet.length) {
      excluded.push({ offer, unmet });
      continue;
    }
    const unknown = constraintResults.filter((r) => r.result === "unknown");
    const fit: Fit = unknown.length ? "partial" : "full";

    const check = checkPriceEvidence(offer.price, "AI_SUGGESTION", opts.currency, opts.asOf);
    const reasons: string[] = [];
    reasons.push(
      fit === "full"
        ? "Meets every stated requirement"
        : `Not confirmed: ${unknown.map((u) => describe(u.constraint)).join(", ")}`,
    );
    if (offer.isOperator) reasons.push("Supplied by Kenac Computer Systems, which operates Budget Buddy");
    if (!check.ok) reasons.push(priceIssueText(check.reason));
    else if (check.stale) reasons.push("Price may be out of date; refresh before relying on it");

    ranked.push({
      offer,
      fit,
      constraintResults,
      usablePrice: check.ok ? check.amount : null,
      priceIssue: check.ok ? null : check.reason,
      reasons,
    });
  }

  ranked.sort(compareRanked);

  const operatorCanSupply = ranked.some((r) => r.offer.isOperator && r.fit === "full");
  return {
    ranked,
    excluded,
    operatorCanSupply,
    needsExternalOptions: !operatorCanSupply || Boolean(opts.requireCompetingQuotes),
  };
}

function compareRanked(a: RankedOffer, b: RankedOffer): number {
  if (a.fit !== b.fit) return a.fit === "full" ? -1 : 1;
  if (a.offer.isOperator !== b.offer.isOperator) return a.offer.isOperator ? -1 : 1;
  if (!!a.usablePrice !== !!b.usablePrice) return a.usablePrice ? -1 : 1;
  if (a.usablePrice && b.usablePrice) return a.usablePrice.comparedTo(b.usablePrice);
  return 0;
}

function priceIssueText(reason: string): string {
  switch (reason) {
    case "no_evidence":
      return "No sourced price: request a quote";
    case "expired":
      return "Price has expired: request an updated quote";
    case "currency_mismatch":
      return "Priced in a different currency from this line";
    default:
      return "Price cannot be used without a source";
  }
}
