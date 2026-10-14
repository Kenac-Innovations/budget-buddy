import { z } from "zod";
import products from "../../../catalogue/kenac/products.json";
import { CatalogueEntry, KENAC_NAME, type CatalogueReader } from "./catalogue";

// Imported once per server module. These are supply families, never price evidence.
const entries = z.array(CatalogueEntry).parse(products.map(row => ({
  id: row.sku, sku: row.sku, name: row.name, category: row.category, unit: row.unit,
  attributes: row.attributes, imageUrl: row.image_url || null, active: true,
  price: row.price, currency: row.currency, priceListRef: null, priceListDate: null, validUntil: null,
  supplier: { id: "kenac", name: KENAC_NAME, isOperator: true },
})));
if (entries.some(entry => entry.price !== null || entry.currency !== null)) {
  throw new Error("The bundled supply catalogue must be unpriced");
}

export function loadBundledCatalogue(): CatalogueReader {
  return { loadActive: async category => structuredClone(entries.filter(entry => entry.category === category)) };
}
