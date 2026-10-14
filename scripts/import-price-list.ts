import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import { parseArgs } from "node:util";
import { getPricingClient, importPriceList } from "../src/lib/pricing/catalogue";
import { PriceListMetadata } from "../src/lib/pricing/format";

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true,
    options: { ref: { type: "string" }, date: { type: "string" } } });
  if (positionals.length !== 1 || !values.ref || !positionals[0].toLowerCase().endsWith(".csv")) {
    throw new Error("Use pnpm price-list:import <file.csv> --ref <reference> [--date YYYY-MM-DD]");
  }
  const metadata = PriceListMetadata.parse({ reference: values.ref,
    date: values.date ?? new Date().toISOString().slice(0, 10) });
  if ((await stat(positionals[0])).size > 10_000_000) throw new Error("Price list exceeds 10 MB");
  const csv = await readFile(positionals[0], "utf8");
  const prisma = getPricingClient();
  if (!prisma) throw new Error("Set DATABASE_URL before importing a price list");
  try {
    const result = await importPriceList(prisma, csv, metadata);
    console.log(`Created: ${result.created} · updated: ${result.updated} · deactivated: ${result.deactivated} · rejected: ${result.rejected.length}`);
    for (const rejected of result.rejected) console.log(`Row ${rejected.row}: ${rejected.reasons.join("; ")}`);
    if (!result.applied) console.log("No valid items. Catalogue unchanged.");
    if (!result.applied || result.rejected.length) process.exitCode = 1;
  } finally { await prisma.$disconnect(); }
}

main().catch(() => {
  // Avoid printing arbitrary file contents, paths, connection strings or exception text.
  console.error("Import failed. Check the CSV format, --ref, --date and DATABASE_URL. No incomplete import was saved.");
  process.exitCode = 1;
});
