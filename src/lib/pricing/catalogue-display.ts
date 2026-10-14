import { z } from "zod";
import products from "../../../catalogue/kenac/products.json";
import type { PlanLine } from "@/lib/plan/types";

// Browser-safe read-only data: no database, pricing tool, plan operation or evidence.
const Family = z.object({
  sku: z.string().min(1), name: z.string().min(1), category: z.string().min(1),
  price: z.null(), currency: z.null(), image_url: z.string(),
  attributes: z.object({ form_factor: z.string(), use_case: z.string() }).passthrough(),
});
const families = z.array(Family).parse(products);
export const KENAC_SUPPLY_LABEL = "Kenac can supply · price on request";

const aliases: Record<string, RegExp> = {
  "LENOVO-THINKPAD-X1": /\bthinkpad x1\b/i,
  "LENOVO-THINKPAD-T": /\bthinkpad (t\d+|t-series)\b/i,
  "LENOVO-THINKCENTRE": /\bthinkcentre\b/i,
  "DELL-LATITUDE": /\blatitude\b/i,
  "DELL-OPTIPLEX": /\boptiplex\b/i,
  "HP-ELITEBOOK": /\belitebook\b/i,
  "HP-PROBOOK": /\bprobook\b/i,
  "CISCO-CATALYST": /\bcatalyst\b/i,
  "CISCO-MERAKI-MS": /\bmeraki\b.*\b(switches?|switching)\b/i,
  "FORTINET-FORTIGATE-SMB": /\bfortigate\b.*\b(branch|smb)\b/i,
  "FORTINET-FORTIGATE-ENTERPRISE": /\bfortigate\b.*\benterprise\b/i,
};

// Generic categories alone are ambiguous; title intent or a family name is required.
const intents = [
  { category: "Cybersecurity", words: /\b(branch|smb)\b.*\bfirewalls?\b|\bfirewalls?\b.*\b(branch|smb)\b/i, sku: "FORTINET-FORTIGATE-SMB" },
  { category: "Hardware", words: /\b(laptops?|notebooks?)\b/i, sku: "LENOVO-THINKPAD-T" },
  { category: "Networking", words: /\b(switching|switches?)\b/i, sku: "CISCO-MERAKI-MS" },
  { category: "Networking", words: /\b(wi-fi|wifi|wireless|access points?)\b/i, sku: "CISCO-WIRELESS-AP" },
];

/** Illustrative supply association only. It never asserts fit or changes a line/total. */
export function catalogueDisplay(line: Pick<PlanLine, "title" | "category" | "price">) {
  if (line.price || line.category === "Power") return null;
  const candidates = families.filter(family => family.category.toLowerCase() === line.category.toLowerCase());
  const title = line.title.toLowerCase();
  const exact = candidates.find(family => title.includes(family.sku.toLowerCase()) || title.includes(family.name.toLowerCase()));
  const named = candidates.find(family => aliases[family.sku]?.test(line.title));
  const namesVendor = /\b(lenovo|dell|hp|cisco|fortinet|fortigate|meraki|thinkpad|enterprise)\b/i.test(line.title);
  const intent = namesVendor ? undefined : intents.find(intent => intent.category.toLowerCase() === line.category.toLowerCase() && intent.words.test(line.title));
  const family = exact ?? named ?? candidates.find(family => family.sku === intent?.sku);
  if (!family) return null;
  return { sku: family.sku, name: family.name, imageUrl: family.image_url || undefined, label: KENAC_SUPPLY_LABEL,
    fitNote: "Representative family. Confirm specification, availability and fit before requesting a quote." };
}

export function catalogueIllustration(category: string) {
  const key = category.toLowerCase();
  const asset = key === "servers and storage" ? "servers" : key === "networking" ? "networking" :
    key === "cybersecurity" || key === "backup and recovery" ? "cybersecurity" :
    key === "software and subscriptions" || key === "data and analytics" ? "software" : "hardware";
  return `/illustrations/categories/${asset}.svg`;
}
