import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { expect, it } from "vitest";
import images from "../../../catalogue/kenac/images.json";
import products from "../../../catalogue/kenac/products.json";
import sources from "../../../catalogue/kenac/sources.json";
import { catalogueIllustration } from "./catalogue-display";

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
}
it("has one allowed-domain provenance record for each original image and a source for every family", () => {
  expect(images.map(image => image.file).sort()).toEqual(files("public/catalogue/kenac").sort());
  expect(new Set(images.map(image => image.sku)).size).toBe(images.length);
  const allowed = ["lenovo.com", "dell.com", "hp.com", "cisco.com", "fortinet.com", "checkpoint.com",
    "f5.com", "ibm.com", "scalecomputing.com", "redhat.com", "kenac.co.zw"];
  for (const image of images) {
    for (const url of [image.source_page_url, image.image_url]) {
      const host = new URL(url).hostname;
      expect(allowed.some(domain => host === domain || host.endsWith(`.${domain}`))).toBe(true);
    }
    expect(statSync(image.file).size).toBeLessThanOrEqual(1_500_000);
    expect(statSync(image.file).size).toBe(image.bytes);
    expect(image.width).toBeGreaterThanOrEqual(400);
    expect(["jpeg", "png", "webp"]).toContain(image.format);
    expect(createHash("sha256").update(readFileSync(image.file)).digest("hex")).toBe(image.sha256);
    expect(Number.isFinite(Date.parse(image.downloaded_at))).toBe(true);
    expect(image.licence_note).toBe("Manufacturer marketing image, used by Kenac as authorised partner");
    expect(products.find(row => row.sku === image.sku)?.image_url).toBe(image.file.replace(/^public/, ""));
  }
  expect(Object.keys(sources).sort()).toEqual(products.map(product => product.sku).sort());
  for (const row of products) {
    expect(existsSync(`public${catalogueIllustration(row.category)}`)).toBe(true);
    if (row.image_url) expect(images.some(image => image.sku === row.sku)).toBe(true);
  }
});
