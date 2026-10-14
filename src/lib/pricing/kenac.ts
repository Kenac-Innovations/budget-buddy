import { z } from "zod";
import { LinePrice } from "@/lib/plan/types";
import { matchOffers, type Offer } from "@/lib/sourcing/match";
import { CatalogueEntry, PrismaCatalogue, getPricingClient, type CatalogueReader } from "./catalogue";
import { AttributeKey, AttributeValue, Category, Currency } from "./format";

export const ConstraintInput = z.union([
  z.object({ key: AttributeKey, op: z.literal("eq"), value: AttributeValue }).strict(),
  z.object({ key: AttributeKey, op: z.enum(["gte", "lte"]), value: z.number().finite() }).strict(),
  z.object({ key: AttributeKey, op: z.literal("in"), value: z.array(AttributeValue).min(1).max(30) }).strict(),
]);
export const RequirementInput = z.object({ category: Category, constraints: z.array(ConstraintInput).max(30) }).strict();
export type KenacRequirement = z.input<typeof RequirementInput>;
export interface FindOptions { catalogue?: CatalogueReader; asOf?: Date; currency?: string; unit?: string; requireCompetingQuotes?: boolean }

export async function findKenacOffers(requirement: KenacRequirement, options: FindOptions = {}) {
  const req = RequirementInput.parse(requirement);
  const unit = z.string().trim().min(1).max(30).optional().parse(options.unit);
  const asOf = z.date().parse(options.asOf ?? new Date());
  const currency = Currency.parse(options.currency ?? "USD");
  const prisma = options.catalogue ? undefined : getPricingClient();
  const catalogue = options.catalogue ?? (prisma ? new PrismaCatalogue(prisma) : undefined);
  const entries = z.array(CatalogueEntry).parse(catalogue ? await catalogue.loadActive(req.category) : []);
  const offers: Offer[] = entries.filter((entry) => entry.active).map((entry) => ({
    supplierId: entry.supplier.id, supplierName: entry.supplier.name, isOperator: true,
    sku: entry.sku, name: entry.name, category: entry.category,
    attributes: { ...entry.attributes, ...(entry.unit ? { unit: entry.unit } : {}) },
    price: entry.price !== null && entry.currency && entry.priceListRef && entry.priceListDate ? {
      type: "OPERATOR_PRICE_LIST", amount: entry.price, currency: entry.currency,
      reference: `${entry.priceListRef} · ${entry.sku}`, capturedAt: entry.priceListDate, validUntil: entry.validUntil,
    } : null,
  }));
  const matchingRequirement = { ...req, constraints: [...req.constraints,
    ...(unit ? [{ key: "unit", op: "eq" as const, value: unit }] : [])] };
  const matched = matchOffers(matchingRequirement, offers, { asOf, currency, requireCompetingQuotes: options.requireCompetingQuotes });
  return matched.ranked.map((ranked) => {
    const { offer, fit, priceIssue } = ranked;
    const attachable = fit === "full" && ranked.usablePrice !== null;
    const price = attachable && offer.price ? LinePrice.parse({
      unitPrice: ranked.usablePrice!.toFixed(), currency: offer.price.currency,
      ...(offer.sku.length <= 60 ? { product: { sku: offer.sku, name: offer.name,
        ...(entries.find((entry) => entry.sku === offer.sku)?.imageUrl ?
          { imageUrl: entries.find((entry) => entry.sku === offer.sku)!.imageUrl } : {}) } } : {}),
      evidence: { type: "OPERATOR_PRICE_LIST", reference: offer.price.reference,
        capturedAt: offer.price.capturedAt.toISOString(),
        ...(offer.price.validUntil ? { validUntil: offer.price.validUntil.toISOString() } : {}),
        supplier: { name: offer.supplierName, isOperator: true } },
    }) : null;
    return { product: price?.product, sku: offer.sku, name: offer.name, category: offer.category, attributes: offer.attributes,
      supplier: { name: offer.supplierName, isOperator: true }, fit,
      status: fit === "partial" ? "Unconfirmed fit" : attachable ? "Confirmed fit" : "Unusable price",
      attachable, price, priceIssue, constraintResults: ranked.constraintResults,
      reasons: priceIssue === "expired" ? [...ranked.reasons.filter((reason) => !reason.startsWith("Price has expired")),
        "Expired · request an updated quote"] : ranked.reasons };
  });
}
