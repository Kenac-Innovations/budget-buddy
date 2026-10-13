import { describe, expect, it } from "vitest";
import { checkPriceEvidence, sourcedUnitPrice, type PriceEvidence } from "./evidence";
import { matchOffers, type Offer, type Requirement } from "./match";

const asOf = new Date("2026-10-13");

function ev(overrides: Partial<PriceEvidence> = {}): PriceEvidence {
  return {
    type: "OPERATOR_PRICE_LIST",
    amount: "850",
    currency: "USD",
    reference: "Kenac price list 2026-10",
    capturedAt: new Date("2026-10-01"),
    ...overrides,
  };
}

describe("price evidence policy", () => {
  it("accepts a referenced Kenac price-list price", () => {
    expect(sourcedUnitPrice(ev(), "AI_SUGGESTION", "USD", asOf)?.toString()).toBe("850");
  });

  it("rejects an AI price with no evidence", () => {
    expect(checkPriceEvidence(null, "AI_SUGGESTION", "USD", asOf)).toEqual({ ok: false, reason: "no_evidence" });
  });

  it("rejects an AI suggestion backed only by an estimate", () => {
    const r = checkPriceEvidence(ev({ type: "USER_ESTIMATE" }), "AI_SUGGESTION", "USD", asOf);
    expect(r).toEqual({ ok: false, reason: "ai_without_source" });
  });

  it("allows a person's own estimate when they enter it", () => {
    const r = checkPriceEvidence(ev({ type: "USER_ESTIMATE", reference: "T. Moyo" }), "USER", "USD", asOf);
    expect(r.ok).toBe(true);
  });

  it("rejects an expired quote", () => {
    const r = checkPriceEvidence(
      ev({ type: "QUOTE", validUntil: new Date("2026-09-30") }),
      "USER",
      "USD",
      asOf,
    );
    expect(r).toEqual({ ok: false, reason: "expired" });
  });

  it("flags an old price list as stale but still usable", () => {
    const r = checkPriceEvidence(ev({ capturedAt: new Date("2026-05-01") }), "AI_SUGGESTION", "USD", asOf);
    expect(r).toMatchObject({ ok: true, stale: true });
  });
});

const laptopReq: Requirement = {
  category: "Laptops",
  constraints: [
    { key: "ram_gb", op: "gte", value: 16 },
    { key: "warranty_years", op: "gte", value: 3 },
  ],
};

function offer(o: Partial<Offer>): Offer {
  return {
    supplierId: "s",
    supplierName: "Other Supplier",
    isOperator: false,
    sku: "X",
    name: "Laptop",
    category: "Laptops",
    attributes: { ram_gb: 16, warranty_years: 3 },
    price: ev({ type: "PUBLISHED_PRICE", amount: "700" }),
    ...o,
  };
}

const kenac = { supplierId: "kenac", supplierName: "Kenac Computer Systems", isOperator: true };

describe("operator-first matching", () => {
  it("ranks a fitting Kenac offer above a cheaper fitting external offer", () => {
    const r = matchOffers(
      laptopReq,
      [offer({ sku: "EXT" }), offer({ ...kenac, sku: "KEN", price: ev({ amount: "850" }) })],
      { asOf, currency: "USD" },
    );
    expect(r.ranked.map((x) => x.offer.sku)).toEqual(["KEN", "EXT"]);
    expect(r.operatorCanSupply).toBe(true);
    expect(r.needsExternalOptions).toBe(false);
    expect(r.ranked[0].reasons).toContain("Supplied by Kenac Computer Systems, which operates Budget Buddy");
  });

  it("excludes a Kenac offer that fails the spec and asks for external options", () => {
    const r = matchOffers(
      laptopReq,
      [offer({ ...kenac, sku: "KEN8", attributes: { ram_gb: 8, warranty_years: 3 } }), offer({ sku: "EXT" })],
      { asOf, currency: "USD" },
    );
    expect(r.ranked.map((x) => x.offer.sku)).toEqual(["EXT"]);
    expect(r.excluded[0].offer.sku).toBe("KEN8");
    expect(r.needsExternalOptions).toBe(true);
  });

  it("ranks a full external fit above an unverified Kenac fit", () => {
    const r = matchOffers(
      laptopReq,
      [offer({ ...kenac, sku: "KEN?", attributes: { ram_gb: 16 } }), offer({ sku: "EXT" })],
      { asOf, currency: "USD" },
    );
    expect(r.ranked.map((x) => x.offer.sku)).toEqual(["EXT", "KEN?"]);
    expect(r.ranked[1].fit).toBe("partial");
    expect(r.operatorCanSupply).toBe(false);
  });

  it("always shows external options to buyers who need competing quotes", () => {
    const r = matchOffers(laptopReq, [offer({ ...kenac, sku: "KEN" })], {
      asOf,
      currency: "USD",
      requireCompetingQuotes: true,
    });
    expect(r.operatorCanSupply).toBe(true);
    expect(r.needsExternalOptions).toBe(true);
  });

  it("keeps an unpriced offer but ranks priced offers ahead within the same tier", () => {
    const r = matchOffers(
      laptopReq,
      [offer({ sku: "NOPRICE", price: null }), offer({ sku: "PRICED" })],
      { asOf, currency: "USD" },
    );
    expect(r.ranked.map((x) => x.offer.sku)).toEqual(["PRICED", "NOPRICE"]);
    expect(r.ranked[1].usablePrice).toBeNull();
    expect(r.ranked[1].reasons).toContain("No sourced price: request a quote");
  });
});
