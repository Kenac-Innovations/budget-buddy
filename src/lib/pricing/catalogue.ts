import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { Attributes, Category, Currency, ImageUrl, Money, PriceListMetadata, parsePriceList } from "./format";

export const KENAC_SUPPLIER_ID = "kenac";
export const KENAC_NAME = "Kenac Computer Systems";
export const CatalogueEntry = z.object({
  id: z.string().min(1), sku: z.string().min(1).max(80), name: z.string().min(1).max(160),
  imageUrl: ImageUrl.nullable().optional(),
  category: Category, attributes: Attributes, unit: z.string().min(1).max(30).nullable(),
  price: Money.nullable(), currency: Currency.nullable(), priceListRef: z.string().min(1).max(200).nullable(),
  priceListDate: z.date().nullable(), validUntil: z.date().nullable(), active: z.boolean(),
  supplier: z.object({ id: z.string().min(1), name: z.literal(KENAC_NAME), isOperator: z.literal(true) }),
});
export type CatalogueEntry = z.infer<typeof CatalogueEntry>;
export interface CatalogueReader { loadActive(category: string): Promise<CatalogueEntry[]> }

export class PrismaCatalogue implements CatalogueReader {
  constructor(private readonly prisma: Pick<PrismaClient, "catalogueItem">) {}
  async loadActive(category: string): Promise<CatalogueEntry[]> {
    const rows = await this.prisma.catalogueItem.findMany({
      where: { active: true, category: { equals: Category.parse(category), mode: "insensitive" },
        supplier: { name: KENAC_NAME, isOperator: true } },
      include: { supplier: { select: { id: true, name: true, isOperator: true } } },
      orderBy: { sku: "asc" },
    });
    return rows.flatMap((row) => {
      const result = CatalogueEntry.safeParse({ ...row, price: row.price?.toFixed() ?? null });
      // Legacy or malformed records never become model-authorized prices.
      return result.success ? [result.data] : [];
    });
  }
}

/** Lazy construction keeps missing database configuration safe in demo/no-list environments. */
let client: PrismaClient | undefined;
export function getPricingClient(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  return client ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000 }), log: [] });
}

export async function importPriceList(prisma: Pick<PrismaClient, "$transaction">, csv: string, metadata: PriceListMetadata) {
  const meta = PriceListMetadata.parse(metadata);
  const parsed = parsePriceList(csv);
  // An empty/broken export must not silently deactivate the whole catalogue.
  if (!parsed.rows.length) return { created: 0, updated: 0, deactivated: 0, rejected: parsed.rejected, applied: false };
  const counts = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // One complete snapshot at a time, including first-time supplier creation.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(21404)`;
    const existing = await tx.supplier.findFirst({ where: { name: KENAC_NAME }, orderBy: { createdAt: "asc" } });
    const supplier = await tx.supplier.upsert({ where: { id: existing?.id ?? KENAC_SUPPLIER_ID },
      create: { id: KENAC_SUPPLIER_ID, name: KENAC_NAME, isOperator: true },
      update: { name: KENAC_NAME, isOperator: true } });
    const current = await tx.catalogueItem.findMany({ where: { supplierId: supplier.id }, select: { sku: true } });
    const known = new Set(current.map((item) => item.sku));
    let created = 0;
    let updated = 0;
    for (const row of parsed.rows) {
      const data = { name: row.name, category: row.category, unit: row.unit, price: row.price,
        imageUrl: row.image_url || null, currency: row.currency, attributes: row.attributes, active: true,
        priceListRef: meta.reference, priceListDate: new Date(`${meta.date}T00:00:00.000Z`),
        validUntil: row.valid_until ? new Date(`${row.valid_until}T23:59:59.999Z`) : null };
      await tx.catalogueItem.upsert({ where: { supplierId_sku: { supplierId: supplier.id, sku: row.sku } },
        create: { ...data, supplierId: supplier.id, sku: row.sku }, update: data });
      if (known.has(row.sku)) updated++; else created++;
    }
    const removed = await tx.catalogueItem.updateMany({ where: { supplierId: supplier.id, active: true,
      sku: { notIn: parsed.presentSkus } }, data: { active: false } });
    return { created, updated, deactivated: removed.count };
  }, { timeout: 60_000 });
  return { ...counts, rejected: parsed.rejected, applied: true };
}
