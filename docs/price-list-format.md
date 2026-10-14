# Kenac price list

Import a complete CSV snapshot of the current Kenac catalogue. It is used only to price budget lines; it does not influence advice about what to do.

```sh
pnpm price-list:import ./kenac.csv --ref "Kenac price list 2026-10" --date 2026-10-14
```

`--ref` is required. `--date` is the date of the source price list, not the upload date. If omitted it defaults to today's UTC date; use that default only for a newly issued list. Reuse the original date and reference on a re-import so stale prices are not made to look fresh. The importer needs `DATABASE_URL` and loads `.env`.

The exact headers are `sku,name,category,unit,price,currency,valid_until,attributes` with optional `image_url` (order may vary). UTF-8 with or without a BOM is supported. Export Excel lists as CSV first; XLSX input is not supported.

| Column | Format |
| --- | --- |
| sku | Stable unique SKU, up to 80 characters. Duplicate SKUs are rejected, including all occurrences. |
| name | Product or service description, up to 160 characters. |
| category | One of the categories below; case is normalised. |
| unit | Unit the price buys, e.g. `device`, `seat`, `site`, `hour` or `unit`, up to 30 characters. |
| price | Nonnegative decimal string, up to six decimal places and 14 integer digits. No currency symbols or thousands separators. Blank is rejected; it never becomes zero. |
| currency | Three uppercase letters, e.g. `USD`. Prices in different currencies are not converted by the lookup. |
| valid_until | A real `YYYY-MM-DD` date or blank. Valid through the end of that day in UTC. Expired items remain available for inspection but cannot be attached. |
| image_url | Optional local asset path starting with a single `/`, or an `https://` URL, up to 500 characters. Blank clears the image. Assets must be supplied by Kenac. |
| attributes | JSON object or `key=value;key=value`. Blank means unknown specifications. Keys are lowercase letters, digits and underscores, starting with a letter. Values are strings, finite numbers or booleans; no nested objects or arrays. |

The advisor uses these categories: **Hardware**, **Software and subscriptions**, **Connectivity**, **Cloud and hosting**, **Cybersecurity**, **Professional services**, **Support and maintenance**, **Training**, **Power**.

For example, `ram_gb=16;cpu_class=i5;warranty_years=3` or `{"ram_gb":16,"cpu_class":"i5","warranty_years":3}`. CSV JSON cells must be quoted with doubled internal quotes. Use consistent attributes such as `capacity_va`, `capacity_kw`, `licence_tier`, `bandwidth_mbps` and `warranty_years`; the lookup checks only stated constraints. Do not put contact details in a list. The reserved `unit` matching attribute always comes from the `unit` column.

The sample at `src/lib/pricing/__fixtures__/kenac-sample.csv` contains **synthetic test prices**, not Kenac commercial evidence. Never import it into a pilot or production database. It is not loaded automatically by runtime or demo mode. No genuine Kenac list has been supplied yet; without one, lines stay Unpriced or use the user's quote or estimate.

An import atomically upserts the Kenac supplier (`isOperator: true`) and items by supplier/SKU, restoring previously deactivated items. Missing SKUs are deactivated, never deleted. Rejected SKUs retain their last accepted record. Empty/all-invalid files leave the entire catalogue unchanged. A malformed CSV or incorrect header aborts before writes. Counts and row numbers with validation reasons are printed; any rejection returns exit code 1 even if the valid rows were saved. Correct and re-import the complete file. Imports are serialised with a database transaction lock. Apply the additive catalogue-image migration before importing images.

Full usable offers also return `product {sku, name, imageUrl}` inside their attachable `price`. Pass that exact price into `price_line` to retain the image.

Every usable offer has `OPERATOR_PRICE_LIST` evidence: reference `<ref> · <sku>`, captured date from `--date`, validity from the row, and `supplier.isOperator: true`. Full fits rank above unconfirmed fits. Failed constraints exclude an item. Partial fits, expired prices, missing source metadata and currency mismatches cannot authorize `price_line`. Lists older than 90 days without a validity date carry the shared evidence policy's refresh warning. Prices alone do not include installation, training, support or taxes unless the source and specification say so; those scope questions remain with the advisor.

T4 exports `createKenacToolRegistry()` from `src/lib/advisor/tools/kenac.ts`. It registers the lookup through T1's existing `createToolRegistry(extraTools)` extension point. T8 must pass that registry to the agent's `registry` option (or add the tool to T1's default registry). The lookup only records full, usable offers in `context.documentedPrices`; attaching one still requires the separate `price_line` tool. The result offers alternatives and requests competing quotes for public entities.
