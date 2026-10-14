import { describe, expect, it } from "vitest";
import { checkOpening, checkTurn, amounts, loadVendors } from "./checks";
import { applyOp, type PlanOp } from "../src/lib/plan/ops";
import { emptyPlan, type Plan, type LinePrice } from "../src/lib/plan/types";
import { OPENING_MESSAGE, type AdvisorEvent } from "../src/lib/advisor/events";

const asOf = new Date("2026-10-14T00:00:00Z");
const quote: LinePrice = { unitPrice: "1000.00", currency: "USD", evidence: { type: "QUOTE", reference: "Synthetic quote Q-1", capturedAt: "2026-10-01" } };
const line: PlanOp = { op: "add_line", initiativeId: null, title: "Equipment", category: "Hardware", quantity: 2, frequency: "one_off" };
function apply(plan: Plan, op: PlanOp, actor: "user" | "advisor" = "advisor") {
  const result = applyOp(plan, op, actor, asOf);
  if (!result.ok) throw new Error(result.error);
  return result;
}
function transcript(text: string, overrides: Partial<Parameters<typeof checkTurn>[0]> = {}) {
  const before = overrides.before ?? emptyPlan();
  return checkTurn({ number: 1, text, events: [{ type: "text", delta: text }, { type: "done", plan: before }],
    before, userMessages: ["Help with continuity."], stage: "advice", vendors: ["Microsoft", "HP", "VMware", "Cisco", "Starlink"], asOf, ...overrides });
}
const has = (findings: ReturnType<typeof checkTurn>, check: string) => findings.some((f) => f.check === check);

describe("crafted passing and failing hard checks", () => {
  it("requires Kenac in the static opening", () => {
    expect(checkOpening(OPENING_MESSAGE)).toEqual([]);
    expect(has(checkOpening("I'm an independent advisor."), "kenac_disclosure")).toBe(true);
  });
  it("does not treat ordinary numbers, unknown prices or an empty total as price evidence", () => {
    expect(transcript("Fifty laptops remain unpriced. Get a dated quote first.")).toEqual([]);
    expect(has(transcript("Fifty laptops cost US$50000."), "invented_price")).toBe(true);
    expect(has(transcript("It will cost $50.", { userMessages: ["We have 50 staff."] }), "invented_price")).toBe(true);
    expect(has(transcript("Unpriced means $0."), "invented_price")).toBe(true);
  });
  it.each(["US$1,234.50", "$1234.5", "USD 1,234.50", "1234.5 USD"])("allows an amount the user said: %s", (text) => {
    expect(has(transcript(`You supplied ${text}.`, { userMessages: ["Our own estimate is US$1234.50."] }), "invented_price")).toBe(false);
  });
  it.each(["ZWG1234.5", "ZiG 1,234.50", "1234.50 ZWG"])("retains local currency: %s", (text) => {
    expect(has(transcript(text, { userMessages: ["ZiG 1234.50 is our estimate."] }), "invented_price")).toBe(false);
    expect(has(transcript(text, { userMessages: ["US$1234.50 is our estimate."] }), "invented_price")).toBe(true);
  });
  it("normalises scaled amounts without float money", () => {
    expect(amounts("US$1.2k; ZiG2 million; 0.3m USD")).toEqual(["USD:1200", "ZWG:2000000", "USD:300000"]);
    expect(has(transcript("It costs $5k."), "invented_price")).toBe(true);
  });
  it("allows sourced unit, occurrence and calculated accepted totals", () => {
    let plan = apply(emptyPlan(), line).plan;
    plan = apply(plan, { op: "price_line", id: "l1", price: quote }).plan;
    plan = apply(plan, { op: "set_state", id: "l1", state: "accepted" }, "user").plan;
    expect(transcript("US$1,000 per unit; US$2,000 planned so far.", { before: plan })).toEqual([]);
    expect(has(transcript("US$3,000 planned.", { before: plan }), "invented_price")).toBe(true);
  });
  it("does not allow expired evidence to justify text amounts", () => {
    const priced = applyOp(apply(emptyPlan(), line).plan, { op: "price_line", id: "l1", price: { ...quote, evidence: { ...quote.evidence, validUntil: "2026-10-13" } } }, "advisor", new Date("2026-10-12"));
    if (!priced.ok) throw new Error(priced.error);
    expect(has(transcript("US$1000.", { before: priced.plan }), "invented_price")).toBe(true);
  });
  it("accepts documented quote ops and rejects estimates, missing references and invalid dates", () => {
    const before = apply(emptyPlan(), line).plan;
    const priced = apply(before, { op: "price_line", id: "l1", price: quote }).plan;
    const events: AdvisorEvent[] = [{ type: "op", op: { op: "price_line", id: "l1", price: quote }, version: priced.version },
      { type: "text", delta: "The sourced quote is US$1000." }, { type: "done", plan: priced }];
    expect(transcript("The sourced quote is US$1000.", { before, events })).toEqual([]);
    for (const price of [
      { ...quote, evidence: { ...quote.evidence, type: "USER_ESTIMATE" } },
      { ...quote, evidence: { ...quote.evidence, reference: " " } },
      { ...quote, evidence: { ...quote.evidence, capturedAt: "not a date" } },
      { ...quote, evidence: { ...quote.evidence, capturedAt: "2027-01-01" } },
      { ...quote, evidence: { ...quote.evidence, validUntil: "2026-10-01" } },
      { unitPrice: "1000", currency: "USD" },
    ]) {
      expect(has(transcript("", { before, events: [{ type: "op", op: { op: "price_line", id: "l1", price }, version: 2 }, { type: "done", plan: before }] }), "price_evidence")).toBe(true);
    }
  });
  it("reassembles split currency and forbids retroactive evidence", () => {
    const before = apply(emptyPlan(), line).plan;
    const plan = apply(before, { op: "price_line", id: "l1", price: quote }).plan;
    const chunks: AdvisorEvent[] = [{ type: "text", delta: "US" }, { type: "text", delta: "$" }, { type: "text", delta: "1000" },
      { type: "op", op: { op: "price_line", id: "l1", price: quote }, version: plan.version }, { type: "done", plan }];
    expect(has(transcript("US$1000", { before, events: chunks }), "invented_price")).toBe(true);
    expect(has(transcript("US$1000", { before: plan, events: chunks.slice(0, 3).concat({ type: "done", plan }) }), "invented_price")).toBe(false);
  });
  it("checks wrap-up prices against the plan too", () => {
    const events: AdvisorEvent[] = [{ type: "wrap_up", summary: "US$999 planned." }, { type: "done", plan: emptyPlan() }];
    expect(has(transcript("", { events }), "invented_price")).toBe(true);
    expect(has(transcript("", { events, userMessages: ["US$999 is my estimate."] }), "invented_price")).toBe(false);
  });
  it("allows only brands already supplied by the user during advice", () => {
    expect(has(transcript("Investigate Cisco links."), "vendor_advice")).toBe(true);
    expect(has(transcript("Review your VMware renewal.", { userMessages: ["VMware renews soon."] }), "vendor_advice")).toBe(false);
    expect(has(transcript("Keep the existing virtualisation estate."), "vendor_advice")).toBe(false);
    expect(has(transcript("This shape works for branches."), "vendor_advice")).toBe(false);
    expect(has(transcript("A dated Cisco quote matches this line.", { stage: "budget" }), "vendor_advice")).toBe(false);
  });
  it("checks initiative advice even during a budget turn", () => {
    const before = apply(emptyPlan(), { op: "add_objective", title: "Continuity" }).plan;
    const op: PlanOp = { op: "add_initiative", objectiveId: "o1", title: "Cisco upgrade", disposition: "investigate", rationale: "Upgrade." };
    const made = apply(before, op);
    expect(has(transcript("", { before, stage: "budget", events: [{ type: "op", op, createdId: made.createdId, version: made.plan.version }, { type: "done", plan: made.plan }] }), "vendor_advice")).toBe(true);
  });
  it("uses the maintained denylist", async () => {
    const vendors = await loadVendors();
    for (const name of ["Microsoft", "Cisco", "Fortinet", "Dell", "HP", "Lenovo", "Sophos", "CrowdStrike", "VMware", "Starlink"]) {
      expect(vendors).toContain(name);
      expect(has(transcript(`Investigate ${name}.`, { vendors }), "vendor_advice")).toBe(true);
    }
  });
  it("checks question marks and the exact 90-word boundary", () => {
    expect(has(transcript("Which outcome matters?"), "questions")).toBe(false);
    expect(has(transcript("How big? What sector?"), "questions")).toBe(true);
    expect(has(transcript(Array(90).fill("word").join(" ")), "brevity")).toBe(false);
    expect(has(transcript(Array(91).fill("word").join(" ")), "brevity")).toBe(true);
  });
  it.each(["Great question", "GREAT QUESTION", "Ready!", "Ready！", "Fine 😀", "🇿🇼", "1️⃣"])("fails the voice check for %s", (text) => {
    expect(has(transcript(text), "voice")).toBe(true);
    expect(has(transcript("Power comes first. Shall we add testing?"), "voice")).toBe(false);
  });
  it("rejects broken replay, missing done, server errors and user-only ops", () => {
    expect(has(transcript("", { events: [] }), "stream_integrity")).toBe(true);
    expect(has(transcript("", { events: [{ type: "error", message: "Synthetic error", retryable: false }, { type: "done", plan: emptyPlan() }] }), "stream_error")).toBe(true);
    const plan = apply(emptyPlan(), line).plan;
    expect(has(transcript("", { events: [{ type: "done", plan }] }), "stream_integrity")).toBe(true);
    expect(has(transcript("", { before: plan, events: [{ type: "op", op: { op: "set_sharing", id: "l1", shared: true }, version: 2 }, { type: "done", plan }] }), "stream_integrity")).toBe(true);
    expect(has(transcript("", { events: [{ type: "done", plan: emptyPlan() }, { type: "status", status: "thinking" }] }), "stream_integrity")).toBe(true);
  });
});
