import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePriceList, PriceListMetadata } from "./format";

export const sampleCsv = readFileSync(new URL("./__fixtures__/kenac-sample.csv", import.meta.url), "utf8");
const header = "sku,name,category,unit,price,currency,valid_until,attributes\n";
describe("price-list format", () => {
  it("accepts optional local and https images and rejects unsafe image URLs", () => {
    for (const url of ["", "/catalogue/item.svg", "https://example.com/item.webp"]) {
      expect(parsePriceList(header.trim() + ",image_url\nA,Item,Hardware,unit,1,USD,,," + url).rows[0].image_url).toBe(url);
    }
    for (const url of ["//example.com/item", "http://example.com/item", "javascript:alert(1)"]) {
      expect(parsePriceList(header.trim() + ",image_url\nA,Item,Hardware,unit,1,USD,,," + url).rejected).toHaveLength(1);
    }
  });
  it("parses JSON and key=value specifications, normalising decimal strings", () => {
    const parsed = parsePriceList(`\uFEFF${sampleCsv}`);
    expect(parsed.rejected).toEqual([]);
    expect(parsed.rows).toHaveLength(5);
    expect(parsed.rows[0]).toMatchObject({ price: "1149", attributes: { ram_gb: 16, cpu_class: "i5", warranty_years: 3 } });
    expect(parsed.rows[1].attributes.ram_gb).toBe(8);
    expect(parsePriceList(header + "A,Service,training,hour,0.123456,USD,,remote=true").rows[0])
      .toMatchObject({ category: "Training", price: "0.123456", attributes: { remote: true } });
  });
  it.each(["", "NaN", "1e3", "-1", "1.1234567", "100000000000000", "1,000"])
    ("rejects invalid price %s without turning it into zero", (price) => {
      const parsed = parsePriceList(header + `A,Item,Hardware,unit,"${price}",USD,,`);
      expect(parsed.rows).toEqual([]);
      expect(parsed.rejected[0].reasons.join()).toContain("price:");
    });
  it("accepts blank monetary fields as unknown, while keeping explicit zero priced", () => {
    expect(parsePriceList(header + "A,Family,Networking,device,,,,").rows[0])
      .toMatchObject({ price: null, currency: null, valid_until: "" });
    expect(parsePriceList(header + "A,Family,Networking,device,0,USD,,").rows[0].price).toBe("0");
    for (const values of [",USD,", ",,2027-01-01", "1,,"]) {
      expect(parsePriceList(header + `A,Family,Networking,device,${values},`).rejected).toHaveLength(1);
    }
  });
  it("preserves exact large money amounts", () => {
    expect(parsePriceList(header + "A,Item,Hardware,unit,99999999999999.999999,USD,,").rows[0].price)
      .toBe("99999999999999.999999");
  });
  it.each(["2026-02-30", "2026-13-01", "yesterday"])("rejects invalid calendar day %s", (day) => {
    expect(parsePriceList(header + `A,Item,Hardware,unit,1,USD,${day},`).rejected[0].reasons.join()).toContain("valid_until");
    expect(PriceListMetadata.safeParse({ reference: "List", date: day }).success).toBe(false);
  });
  it.each(["x=1;x=2", "bad", "__proto__=1", '"{""nested"":{}}"', '"{""ram_gb"":null}"'])
    ("rejects ambiguous or unsupported attributes %s", (attributes) => {
      expect(parsePriceList(header + `A,Item,Hardware,unit,1,USD,,${attributes}`).rejected).toHaveLength(1);
    });
  it("rejects every duplicate SKU and keeps it present", () => {
    const parsed = parsePriceList(header + "A,Item,Hardware,unit,1,USD,,\nA,Other,Hardware,unit,2,USD,,\nB,Item,Hardware,unit,bad,USD,,");
    expect(parsed.rows).toEqual([]);
    expect(parsed.presentSkus).toEqual(["A", "B"]);
    expect(parsed.rejected.map((row) => row.row)).toEqual([2, 3, 4]);
  });
  it("refuses malformed CSV and unexpected headers before any import", () => {
    expect(() => parsePriceList(header + "A,Too,few")).toThrow();
    expect(() => parsePriceList(header + '"unterminated')).toThrow();
    expect(() => parsePriceList(header.replace("sku", "name"))).toThrow();
    expect(parsePriceList(header).rows).toEqual([]);
  });
});
