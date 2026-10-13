import Decimal from "decimal.js";

/**
 * Price-evidence policy (docs/decisions.md D4): a budget line carries a price only when
 * that price is backed by a source. AI may propose a price only by citing evidence that
 * already exists (Kenac price list, a published price, a quote, a contract, or the
 * organisation's historical actuals). A USER_ESTIMATE is allowed, but only when a
 * person enters it — never from an AI suggestion.
 */

export type EvidenceType =
  | "OPERATOR_PRICE_LIST"
  | "PUBLISHED_PRICE"
  | "QUOTE"
  | "CONTRACT"
  | "HISTORICAL_ACTUAL"
  | "USER_ESTIMATE";

export interface PriceEvidence {
  type: EvidenceType;
  amount: Decimal.Value;
  currency: string;
  reference: string;
  capturedAt: Date;
  validUntil?: Date | null;
}

export type PriceOrigin = "USER" | "IMPORT" | "AI_SUGGESTION";

export type PriceCheck =
  | { ok: true; amount: Decimal; currency: string; stale: boolean }
  | { ok: false; reason: "no_evidence" | "no_reference" | "expired" | "ai_without_source" | "currency_mismatch" };

/** Published prices and price-list entries older than this are flagged for refresh. */
export const STALE_AFTER_DAYS = 90;

const AI_CITABLE: ReadonlySet<EvidenceType> = new Set([
  "OPERATOR_PRICE_LIST",
  "PUBLISHED_PRICE",
  "QUOTE",
  "CONTRACT",
  "HISTORICAL_ACTUAL",
]);

export function checkPriceEvidence(
  evidence: PriceEvidence | null | undefined,
  origin: PriceOrigin,
  lineCurrency: string,
  asOf: Date,
): PriceCheck {
  if (!evidence) return { ok: false, reason: "no_evidence" };
  if (!evidence.reference.trim()) return { ok: false, reason: "no_reference" };
  if (origin === "AI_SUGGESTION" && !AI_CITABLE.has(evidence.type)) {
    return { ok: false, reason: "ai_without_source" };
  }
  if (evidence.currency !== lineCurrency) return { ok: false, reason: "currency_mismatch" };
  if (evidence.validUntil && evidence.validUntil.getTime() < asOf.getTime()) {
    return { ok: false, reason: "expired" };
  }
  const ageDays = (asOf.getTime() - evidence.capturedAt.getTime()) / 86_400_000;
  const stale =
    (evidence.type === "PUBLISHED_PRICE" || evidence.type === "OPERATOR_PRICE_LIST") &&
    !evidence.validUntil &&
    ageDays > STALE_AFTER_DAYS;
  return { ok: true, amount: new Decimal(evidence.amount), currency: evidence.currency, stale };
}

/** The unit price the calculation engine may use: a sourced amount, or null (unpriced). */
export function sourcedUnitPrice(
  evidence: PriceEvidence | null | undefined,
  origin: PriceOrigin,
  lineCurrency: string,
  asOf: Date,
): Decimal | null {
  const check = checkPriceEvidence(evidence, origin, lineCurrency, asOf);
  return check.ok ? check.amount : null;
}
