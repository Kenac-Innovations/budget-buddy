import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePriceList } from "./format";
import { KENAC_NAME, type CatalogueEntry, type CatalogueReader } from "./catalogue";
import { findKenacOffers, type KenacRequirement } from "./kenac";

const rows = parsePriceList(readFileSync(new URL("./__fixtures__/kenac-sample.csv", import.meta.url), "utf8")).rows;
function entries(): CatalogueEntry[] {
  return rows.map((row) => ({ ...row, id: row.sku, active: true, priceListRef: "Synthetic test list",
    priceListDate: new Date("2026-10-14T00:00:00Z"), validUntil: new Date(`${row.valid_until}T23:59:59.999Z`),
    supplier: { id: "kenac", name: KENAC_NAME, isOperator: true } }));
}
const asOf = new Date("2026-10-14T12:00:00Z");
const req = { category: "Hardware", constraints: [{ key: "ram_gb", op: "gte" as const, value: 16 }] };
const catalogue: CatalogueReader = { loadActive: async () => entries() };

describe("Kenac offers", () => {
  it.each<KenacRequirement["constraints"]>([
    [{ key: "cpu_class", op: "eq", value: "i7" }],
    [{ key: "ram_gb", op: "gte", value: 32 }],
    [{ key: "ram_gb", op: "lte", value: 8 }],
    [{ key: "cpu_class", op: "in", value: ["i7", "i9"] }],
  ])("excludes an item failing any supported constraint operator %#", async (...constraints) => {
    const offers = await findKenacOffers({ category: "Hardware", constraints },
      { catalogue: { loadActive: async () => [entries()[0]] }, asOf });
    expect(offers).toEqual([]);
  });
  it("excludes failed constraints, ranks full fits first and never authorizes partial fits", async () => {
    const offers = await findKenacOffers(req, { catalogue, asOf });
    expect(offers.map((offer) => offer.sku)).toEqual(["TEST-LAPTOP-16", "TEST-EXPIRED", "TEST-LAPTOP-UNKNOWN"]);
    expect(offers[0]).toMatchObject({ fit: "full", attachable: true, price: { unitPrice: "1149", currency: "USD",
      evidence: { type: "OPERATOR_PRICE_LIST", reference: "Synthetic test list · TEST-LAPTOP-16",
        capturedAt: "2026-10-14T00:00:00.000Z", supplier: { name: KENAC_NAME, isOperator: true } } } });
    expect(offers[2]).toMatchObject({ fit: "partial", status: "Unconfirmed fit", attachable: false, price: null });
    expect(offers[2].reasons.join()).toContain("Not confirmed: ram_gb");
  });
  it("returns expired items as unusable with an actionable reason", async () => {
    const offers = await findKenacOffers(req, { catalogue, asOf });
    expect(offers.find((offer) => offer.sku === "TEST-EXPIRED")).toMatchObject({ attachable: false, price: null,
      priceIssue: "expired", reasons: expect.arrayContaining(["Expired · request an updated quote"]) });
  });
  it("does not attach a wrong-currency price or a price with missing source metadata", async () => {
    expect((await findKenacOffers(req, { catalogue, asOf, currency: "ZAR" })).every((offer) => !offer.attachable)).toBe(true);
    const incomplete: CatalogueReader = { loadActive: async () => entries().map((entry) => ({ ...entry, priceListDate: null })) };
    expect((await findKenacOffers(req, { catalogue: incomplete, asOf })).every((offer) => offer.price === null)).toBe(true);
  });
  it("honours validity through the end of the stated UTC day", async () => {
    const current: CatalogueReader = { loadActive: async () => [{ ...entries()[0], validUntil: new Date("2026-10-14T23:59:59.999Z") }] };
    expect((await findKenacOffers(req, { catalogue: current, asOf }))[0].attachable).toBe(true);
    expect((await findKenacOffers(req, { catalogue: current, asOf: new Date("2026-10-15") }))[0].attachable).toBe(false);
  });
  it("flags old lists without validity and excludes inactive items", async () => {
    const older: CatalogueReader = { loadActive: async () => [{ ...entries()[0], priceListDate: new Date("2026-01-01"), validUntil: null },
      { ...entries()[1], active: false }] };
    const offers = await findKenacOffers(req, { catalogue: older, asOf });
    expect(offers).toHaveLength(1);
    expect(offers[0].reasons.join()).toContain("Price may be out of date");
  });
  it("returns empty when no catalogue exists or no item fits", async () => {
    expect(await findKenacOffers(req, { catalogue: { loadActive: async () => [] }, asOf })).toEqual([]);
    expect(await findKenacOffers({ ...req, constraints: [{ key: "ram_gb", op: "gte", value: 32 }] },
      { catalogue: { loadActive: async () => [entries()[0]] }, asOf })).toEqual([]);
  });
});
