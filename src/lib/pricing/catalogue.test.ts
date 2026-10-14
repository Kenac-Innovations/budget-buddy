import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { importPriceList, KENAC_NAME, PrismaCatalogue } from "./catalogue";

const csv = readFileSync(new URL("./__fixtures__/kenac-sample.csv", import.meta.url), "utf8");
const meta = { reference: "Synthetic test list", date: "2026-10-14" };

// Stateful transaction double: exercises Prisma query shapes and snapshot semantics without Postgres.
function database() {
  let supplier: { id: string; name: string; isOperator: boolean } | null = null;
  const items = new Map<string, Record<string, unknown>>();
  const tx = {
    $queryRaw: vi.fn(async () => []),
    supplier: {
      findFirst: vi.fn(async () => supplier),
      upsert: vi.fn(async ({ create, update }) => supplier = supplier ? { ...supplier, ...update } : create),
    },
    catalogueItem: {
      findMany: vi.fn(async () => [...items.values()]),
      upsert: vi.fn(async ({ where, create, update }) => {
        const sku = where.supplierId_sku.sku;
        const next = items.has(sku) ? { ...items.get(sku), ...update } : { id: `item-${sku}`, ...create };
        items.set(sku, next); return next;
      }),
      updateMany: vi.fn(async ({ where, data }) => {
        let count = 0;
        for (const [sku, item] of items) if (item.active && !where.sku.notIn.includes(sku)) {
          items.set(sku, { ...item, ...data }); count++;
        }
        return { count };
      }),
    },
  };
  const transaction = vi.fn(async (run: (tx: unknown) => Promise<unknown>) => {
    const before = structuredClone([...items]);
    const previousSupplier = structuredClone(supplier);
    try { return await run(tx); }
    catch (error) { items.clear(); for (const [key, row] of before) items.set(key, row); supplier = previousSupplier; throw error; }
  });
  return { prisma: { $transaction: transaction } as unknown as Pick<PrismaClient, "$transaction">,
    tx, items, transaction, supplier: () => supplier };
}

describe("catalogue import", () => {
  it("creates the sample items and re-imports without duplicates", async () => {
    const db = database();
    expect(await importPriceList(db.prisma, csv, meta)).toMatchObject({ created: 5, updated: 0, deactivated: 0, rejected: [], applied: true });
    const before = structuredClone([...db.items]);
    expect(await importPriceList(db.prisma, csv, meta)).toMatchObject({ created: 0, updated: 5, deactivated: 0 });
    expect([...db.items]).toEqual(before);
    expect(db.supplier()).toMatchObject({ name: KENAC_NAME, isOperator: true });
    expect(db.items.get("TEST-LAPTOP-16")).toMatchObject({ price: "1149", priceListRef: meta.reference,
      priceListDate: new Date("2026-10-14T00:00:00.000Z"), validUntil: new Date("2027-12-31T23:59:59.999Z") });
    expect(db.tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it("deactivates removed items and reactivates returning items without deleting them", async () => {
    const db = database();
    await importPriceList(db.prisma, csv, meta);
    const smaller = csv.split("\n").filter((line) => !line.startsWith("TEST-UPS,")).join("\n");
    expect(await importPriceList(db.prisma, smaller, meta)).toMatchObject({ deactivated: 1 });
    expect(db.items.get("TEST-UPS")?.active).toBe(false);
    expect(db.items.size).toBe(5);
    await importPriceList(db.prisma, csv, meta);
    expect(db.items.get("TEST-UPS")?.active).toBe(true);
  });
  it("retains the last accepted record for a rejected SKU", async () => {
    const db = database(); await importPriceList(db.prisma, csv, meta);
    const before = structuredClone(db.items.get("TEST-LAPTOP-16"));
    const result = await importPriceList(db.prisma, csv.replace("1149.00", "invalid"), meta);
    expect(result).toMatchObject({ created: 0, updated: 4, deactivated: 0 });
    expect(result.rejected).toHaveLength(1);
    expect(db.items.get("TEST-LAPTOP-16")).toEqual(before);
  });
  it("refuses empty, all-invalid or malformed snapshots before a transaction", async () => {
    const db = database();
    expect((await importPriceList(db.prisma, csv.split("\n")[0], meta)).applied).toBe(false);
    expect((await importPriceList(db.prisma, csv.split("\n")[0] + "\nA,Item,Power,unit,bad,USD,,", meta)).applied).toBe(false);
    await expect(importPriceList(db.prisma, "bad", meta)).rejects.toThrow();
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it("rolls back the snapshot when a write fails", async () => {
    const db = database(); await importPriceList(db.prisma, csv, meta);
    const before = structuredClone([...db.items]);
    db.tx.catalogueItem.upsert.mockRejectedValueOnce(new Error("database write failed"));
    await expect(importPriceList(db.prisma, csv.replace("1149.00", "1000"), meta)).rejects.toThrow();
    expect([...db.items]).toEqual(before);
  });
});

describe("active catalogue reader", () => {
  it("queries only active Kenac items in the category and validates decimal/source fields", async () => {
    const row = { id: "item", sku: "A", name: "Endpoint", category: "Hardware", unit: "device", attributes: { ram_gb: 16 },
      price: new Prisma.Decimal("99999999999999.999999"), currency: "USD", priceListRef: "List", priceListDate: new Date(),
      validUntil: null, active: true, supplier: { id: "kenac", name: KENAC_NAME, isOperator: true } };
    const findMany = vi.fn(async () => [row, { ...row, attributes: { invalid: null } }]);
    const reader = new PrismaCatalogue({ catalogueItem: { findMany } } as unknown as Pick<PrismaClient, "catalogueItem">);
    expect(await reader.loadActive("hardware")).toMatchObject([{ price: "99999999999999.999999" }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true,
      category: { equals: "Hardware", mode: "insensitive" }, supplier: { name: KENAC_NAME, isOperator: true } } }));
  });
});
