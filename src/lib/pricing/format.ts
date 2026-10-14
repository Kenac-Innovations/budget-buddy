import Decimal from "decimal.js";
import { parse } from "csv-parse/sync";
import { z } from "zod";

export const CATEGORIES = ["Hardware", "Software and subscriptions", "Connectivity", "Cloud and hosting",
  "Cybersecurity", "Professional services", "Support and maintenance", "Training", "Power",
  "Servers and storage", "Networking", "Backup and recovery", "Data and analytics"] as const;
export const Category = z.string().trim().transform((value) =>
  CATEGORIES.find((category) => category.toLowerCase() === value.toLowerCase()) ?? value)
  .pipe(z.enum(CATEGORIES));
export const AttributeKey = z.string().regex(/^[a-z][a-z0-9_]{0,59}$/);
export const AttributeValue = z.union([z.string().trim().min(1).max(200), z.number().finite(), z.boolean()]);
export const Attributes = z.unknown().refine((value) => value !== null && typeof value === "object" && !Array.isArray(value) &&
  Object.keys(value).every((key) => AttributeKey.safeParse(key).success), "Use an object with valid attribute keys")
  .pipe(z.record(AttributeKey, AttributeValue)).refine((value) => Object.keys(value).length <= 50,
  "Use at most 50 attributes");
export const Money = z.string().trim().regex(/^\d+(\.\d{1,6})?$/, "Use a nonnegative decimal with at most six decimal places")
  .pipe(z.string().refine((value) => new Decimal(value).lessThan("100000000000000"), "Price exceeds the database precision"))
  .transform((value) => new Decimal(value).toFixed());
export const Currency = z.string().trim().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase currency code");
export const IsoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}, "Use a real calendar date (YYYY-MM-DD)");
export const PriceListMetadata = z.object({
  reference: z.string().trim().min(1).max(200),
  date: IsoDay,
}).strict();
export type PriceListMetadata = z.infer<typeof PriceListMetadata>;

export const ImageUrl = z.string().trim().max(500).refine((value) => {
  if (value === "") return true;
  if (value.startsWith("/") && !value.startsWith("//")) return !/[\\\s]/.test(value);
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Use a local asset path or https URL");

export const PriceListRow = z.object({
  sku: z.string().trim().min(1).max(80), name: z.string().trim().min(1).max(160), category: Category,
  unit: z.string().trim().min(1).max(30),
  price: z.union([z.literal(""), Money]).transform(value => value === "" ? null : value),
  currency: z.union([z.literal(""), Currency]).transform(value => value === "" ? null : value),
  image_url: ImageUrl.optional(),
  valid_until: z.union([z.literal(""), IsoDay]), attributes: Attributes,
}).strict().superRefine((row, context) => {
  if (row.price === null && (row.currency !== null || row.valid_until !== "")) {
    context.addIssue({ code: "custom", path: ["price"], message: "Unpriced items require blank currency and valid_until" });
  }
  if (row.price !== null && row.currency === null) {
    context.addIssue({ code: "custom", path: ["currency"], message: "A priced item requires a currency" });
  }
});
export type PriceListRow = z.infer<typeof PriceListRow>;
const HEADERS = ["sku", "name", "category", "unit", "price", "currency", "valid_until", "attributes"];
export interface ParsedPriceList {
  rows: PriceListRow[];
  presentSkus: string[];
  rejected: { row: number; reasons: string[] }[];
}

function attributes(value: string): unknown {
  if (!value.trim()) return {};
  if (value.trim().startsWith("{")) return JSON.parse(value);
  const entries = value.split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 1 || index === part.length - 1) throw new Error("Use key=value attributes");
    const key = part.slice(0, index).trim();
    const raw = part.slice(index + 1).trim();
    const typed = raw === "true" ? true : raw === "false" ? false :
      /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
    return [key, typed] as const;
  });
  if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new Error("Duplicate attribute key");
  return Object.fromEntries(entries);
}

/** Reject malformed files before writes. Rejected SKUs remain present for deactivation purposes. */
export function parsePriceList(csv: string): ParsedPriceList {
  const records = parse(csv, { bom: true, skip_empty_lines: true, trim: true, max_record_size: 64_000 }) as string[][];
  const header = records.shift();
  if (!header || ![HEADERS.length, HEADERS.length + 1].includes(header.length) || new Set(header).size !== header.length ||
    header.some((key) => ![...HEADERS, "image_url"].includes(key)) ||
    HEADERS.some((key) => !header.includes(key))) throw new Error("Use the documented price-list headers");
  const rawRows = records.map((values) => Object.fromEntries(header.map((key, i) => [key, values[i]])));
  const skus = rawRows.map((row) => row.sku.trim());
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const sku of skus) { if (seen.has(sku)) duplicates.add(sku); seen.add(sku); }
  const result: ParsedPriceList = { rows: [], presentSkus: [...seen].filter(Boolean), rejected: [] };
  rawRows.forEach((raw, index) => {
    if (duplicates.has(skus[index])) {
      result.rejected.push({ row: index + 2, reasons: ["Duplicate SKU; all occurrences rejected"] });
      return;
    }
    let parsedAttributes: unknown;
    try { parsedAttributes = attributes(raw.attributes); }
    catch { result.rejected.push({ row: index + 2, reasons: ["attributes: use a JSON object or unique key=value pairs"] }); return; }
    const checked = PriceListRow.safeParse({ ...raw, attributes: parsedAttributes });
    if (checked.success) result.rows.push(checked.data);
    else result.rejected.push({ row: index + 2, reasons: checked.error.issues.map((issue) =>
      `${issue.path.join(".")}: ${issue.message}`) });
  });
  return result;
}
