import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import products from "../../../catalogue/kenac/products.json";
import { loadBundledCatalogue } from "./bundled-catalogue";
import { parsePriceList } from "./format";
import { findKenacOffers } from "./kenac";

it("imports the complete CSV as the identical unpriced in-memory snapshot", async () => {
  const csv = parsePriceList(readFileSync(new URL("../../../catalogue/kenac/products.csv", import.meta.url), "utf8"));
  expect(csv.rejected).toEqual([]);
  expect(csv.rows).toEqual(products);
  expect(csv.rows.length).toBeGreaterThanOrEqual(30);
  expect(new Set(csv.rows.map(row => row.category)).size).toBe(7);
  for (const category of new Set(csv.rows.map(row => row.category))) {
    const entries = await loadBundledCatalogue().loadActive(category);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry).toMatchObject({ price: null, currency: null, priceListRef: null, priceListDate: null, validUntil: null });
    }
  }
  const rows = await loadBundledCatalogue().loadActive("Hardware");
  rows[0].name = "Changed by caller";
  expect((await loadBundledCatalogue().loadActive("Hardware"))[0].name).not.toBe("Changed by caller");
});
it("uses the bundled catalogue in demo mode even with an unavailable database", async () => {
  vi.stubEnv("ADVISOR_MODE", "demo");
  vi.stubEnv("DATABASE_URL", "postgresql://unavailable.invalid/db");
  try {
    const offers = await findKenacOffers({ category: "Cybersecurity", constraints: [
      { key: "use_case", op: "eq", value: "branch firewall" }, { key: "segment", op: "eq", value: "smb" },
    ] });
    expect(offers[0]).toMatchObject({ sku: "FORTINET-FORTIGATE-SMB", fit: "full", attachable: false,
      usablePrice: null, price: null, product: { imageUrl: "/catalogue/kenac/fortinet/FORTINET-FORTIGATE-SMB.png" },
      status: "Available through Kenac · price on request" });
  } finally { vi.unstubAllEnvs(); }
});
