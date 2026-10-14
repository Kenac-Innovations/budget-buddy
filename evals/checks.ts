import { readFile } from "node:fs/promises";
import Decimal from "decimal.js";
import { AdvisorEvent } from "../src/lib/advisor/events";
import { applyOp } from "../src/lib/plan/ops";
import { LinePrice, type Plan } from "../src/lib/plan/types";
import { calculateBudget, calculateLine } from "../src/lib/budget/calculate";
import { planTotals, planToEngineLines } from "../src/lib/plan/totals";
import { checkPriceEvidence } from "../src/lib/sourcing/evidence";
import type { Finding, Stage } from "./schema";

export async function loadVendors() {
  return (await readFile(new URL("./vendors.txt", import.meta.url), "utf8"))
    .split(/\r?\n/).map((v) => v.trim()).filter((v) => v && !v.startsWith("#"));
}
function containsName(text: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(text);
}

/** Normalise with Decimal, retaining currency. A dollar amount cannot justify a ZiG amount. */
export function amounts(text: string): string[] {
  const prefix = /(?:US\s*\$|USD|ZWG|ZiG|\$)\s*([+-]?\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*(k|m|thousand|million)\b)?/gi;
  const suffix = /([+-]?\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*(k|m|thousand|million)\b)?\s*(USD|ZWG|ZiG)\b/gi;
  const found: string[] = [];
  const record = (currency: string, digits: string, scale?: string) => {
    const multiplier = /^(k|thousand)$/i.test(scale ?? "") ? "1000" : /^(m|million)$/i.test(scale ?? "") ? "1000000" : "1";
    found.push(`${/ZWG|ZiG/i.test(currency) ? "ZWG" : "USD"}:${new Decimal(digits.replaceAll(",", "")).times(multiplier).toString()}`);
  };
  for (const match of text.matchAll(prefix)) record(match[0], match[1], match[2]);
  for (const match of text.matchAll(suffix)) record(match[3], match[1], match[2]);
  return found;
}

function documentedPrice(raw: unknown, asOf: Date, advisor: boolean) {
  const parsed = LinePrice.safeParse(raw);
  if (!parsed.success) return false;
  const { evidence, currency, unitPrice } = parsed.data;
  const captured = new Date(evidence.capturedAt);
  const valid = evidence.validUntil ? new Date(evidence.validUntil) : null;
  if (!Number.isFinite(captured.getTime()) || captured > asOf || (valid && !Number.isFinite(valid.getTime()))) return false;
  return checkPriceEvidence({ type: evidence.type, amount: unitPrice, currency,
    reference: evidence.reference, capturedAt: captured, validUntil: valid },
    advisor ? "AI_SUGGESTION" : "USER", currency, asOf).ok;
}

function sourcedAmounts(plan: Plan, asOf: Date) {
  const allowed = new Set<string>();
  const inputs = planToEngineLines(plan);
  for (const line of plan.lines) {
    if (!line.price || !documentedPrice(line.price, asOf, false)) continue;
    const key = (value: Decimal.Value) => `${line.price!.currency.toUpperCase()}:${new Decimal(value).toString()}`;
    allowed.add(key(line.price.unitPrice));
    const input = inputs.find((l) => l.id === line.id) ?? {
      id: line.id, currency: line.price.currency, frequency: line.frequency, priceBasis: line.priceBasis,
      quantity: line.quantity, unitPrice: line.price.unitPrice, paymentMonth: line.paymentMonth,
    };
    const result = calculateLine(input, { start: plan.profile.periodStart, end: plan.profile.periodEnd }, plan.profile.reportingCurrency, []);
    if (result.total !== null) allowed.add(key(result.total));
    for (const value of result.monthly.values()) allowed.add(key(value));
  }
  const validInputs = inputs.filter((input) => {
    const line = plan.lines.find((l) => l.id === input.id);
    return line?.price && documentedPrice(line.price, asOf, false);
  });
  // Use the shared totals engine for accepted lines. Never treat an empty/unpriced total as evidence for zero.
  if (validInputs.length) {
    const totals = validInputs.length === inputs.length ? planTotals(plan) : calculateBudget({
      period: { start: plan.profile.periodStart, end: plan.profile.periodEnd },
      reportingCurrency: plan.profile.reportingCurrency, lines: validInputs, rates: [],
    });
    for (const [currency, total] of totals.totalsByCurrency) allowed.add(`${currency}:${total.toString()}`);
    if (totals.lines.some((l) => l.reportingTotal !== null)) allowed.add(`${totals.reportingCurrency}:${totals.reportingTotal.toString()}`);
  }
  return allowed;
}

export function checkOpening(text: string): Finding[] {
  return [
    ...(/\bKenac\b/i.test(text) ? [] : [{ check: "kenac_disclosure", turn: 0, detail: "The first advisor message does not disclose Kenac." }]),
    ...checkStyle(text, 0),
  ];
}

function checkStyle(text: string, turn: number): Finding[] {
  const findings: Finding[] = [];
  const fail = (check: string, detail: string) => findings.push({ check, turn, detail });
  if ((text.match(/\?/g) ?? []).length > 1) fail("questions", "More than one question mark.");
  if (text.trim().split(/\s+/).filter(Boolean).length > 90) fail("brevity", "Reply exceeds 90 words.");
  if (/great\s+question/i.test(text)) fail("voice", "Contains Great question.");
  if (/[!！]/u.test(text)) fail("voice", "Contains an exclamation mark.");
  if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(text)) fail("voice", "Contains emoji.");
  return findings;
}

export function checkTurn(input: {
  number: number; text: string; events: unknown[]; before: Plan; userMessages: string[];
  stage: Stage; vendors: string[]; asOf?: Date;
}): Finding[] {
  const findings: Finding[] = [];
  const fail = (check: string, detail: string) => findings.push({ check, turn: input.number, detail });
  const asOf = input.asOf ?? new Date();
  let current = input.before;
  let ended = false;
  let streamed = "";
  const userText = input.userMessages.join("\n");
  const userAmounts = new Set(input.userMessages.flatMap(amounts));
  // Snapshot evidence at each text delta: a future price op cannot justify an earlier guess.
  const snapshots: { end: number; allowed: Set<string> }[] = [];
  for (const raw of input.events) {
    const parsed = AdvisorEvent.safeParse(raw);
    if (!parsed.success) {
      const isPrice = typeof raw === "object" && raw !== null && "op" in raw &&
        typeof raw.op === "object" && raw.op !== null && "op" in raw.op && raw.op.op === "price_line";
      if (isPrice) fail("price_evidence", "A price_line has missing or malformed evidence.");
      fail("stream_integrity", "Invalid advisor event.");
      continue;
    }
    const event = parsed.data;
    if (ended) fail("stream_integrity", "Event after done.");
    if (event.type === "op") {
      if (event.op.op === "price_line" && !documentedPrice(event.op.price, asOf, true)) {
        fail("price_evidence", "A price_line lacks valid documented evidence or uses an AI estimate.");
      }
      if (event.op.op === "add_initiative" || event.op.op === "update_initiative") {
        const content = [event.op.title, event.op.rationale, event.op.caution].filter(Boolean).join(" ");
        for (const vendor of input.vendors) if (containsName(content, vendor) && !containsName(userText, vendor)) {
          fail("vendor_advice", `Unprompted brand in initiative advice: ${vendor}.`);
        }
      }
      const replay = applyOp(current, event.op, "advisor", asOf);
      if (!replay.ok) fail("stream_integrity", "An emitted operation cannot be replayed as advisor.");
      else {
        current = replay.plan;
        if (current.version !== event.version || replay.createdId !== event.createdId) fail("stream_integrity", "Operation version or created id does not match replay.");
      }
    } else if (event.type === "text") {
      streamed += event.delta;
      snapshots.push({ end: streamed.length, allowed: new Set([...userAmounts, ...sourcedAmounts(current, asOf)]) });
    } else if (event.type === "wrap_up") {
      const allowed = new Set([...userAmounts, ...sourcedAmounts(current, asOf)]);
      for (const amount of amounts(event.summary)) if (!allowed.has(amount)) fail("invented_price", "Unsupported currency amount in wrap-up summary.");
    } else if (event.type === "error") fail("stream_error", "The advisor emitted an error event.");
    else if (event.type === "done") {
      ended = true;
      if (JSON.stringify(event.plan) !== JSON.stringify(current)) fail("stream_integrity", "Final plan does not equal operation replay.");
    }
  }
  if (!ended) fail("stream_integrity", "Missing final done event.");
  if (streamed !== input.text) fail("stream_integrity", "Transcript differs from streamed text.");
  // Reassemble deltas before finding amounts, so splitting US$ across chunks cannot evade checks.
  const currencyPattern = /(?:US\s*\$|USD|ZWG|ZiG|\$)\s*[+-]?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|thousand|million)\b)?|[+-]?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|thousand|million)\b)?\s*(?:USD|ZWG|ZiG)\b/gi;
  for (const match of streamed.matchAll(currencyPattern)) {
    const end = match.index! + match[0].length;
    const allowed = snapshots.find((s) => s.end >= end)?.allowed ?? userAmounts;
    for (const value of amounts(match[0])) if (!allowed.has(value)) fail("invented_price", `Unsupported currency amount: ${value}.`);
  }
  if (input.stage === "advice") {
    for (const vendor of input.vendors) if (containsName(input.text, vendor) && !containsName(userText, vendor)) {
      fail("vendor_advice", `Unprompted brand in advice: ${vendor}.`);
    }
  }
  findings.push(...checkStyle(input.text, input.number));
  return findings;
}
