# T4 · Kenac price list and sourced pricing

**Branch:** `codex/T4-kenac-pricing` · **Wave 2** (start after T1's tool registry is merged) · Read `AGENTS.md`, `docs/decisions.md` (D2, D4) and `docs/build-plan.md` first.

## Goal
When a line could be supplied by Kenac, the advisor can find a **fitting** item on the Kenac price list and attach its price, **labelled Kenac**, with evidence. Everything else stays unpriced or uses the user's quote or estimate. Kenac-first is never allowed to override fit (`src/lib/sourcing/match.ts`).

## You own
`src/lib/pricing/**`, `src/lib/advisor/tools/kenac.ts`, `scripts/import-price-list.ts`, `docs/price-list-format.md`.

## Use (don't change)
`src/lib/sourcing/{match,evidence}.ts`, the `Supplier` and `CatalogueItem` Prisma models, `src/lib/plan/ops.ts`.

## Allowed new dependencies
`csv-parse`, and `exceljs` only if the Kenac list arrives as .xlsx (T5 adds it too; coordinate).

## Build

1. **Price list format** (`docs/price-list-format.md`): `sku, name, category, unit, price, currency, valid_until, attributes`. `attributes` is a JSON object or `key=value;key=value`, e.g. `ram_gb=16;cpu_class=i5;warranty_years=3`.
   - Document the categories the advisor uses (Hardware, Software and subscriptions, Connectivity, Cloud and hosting, Cybersecurity, Professional services, Support and maintenance, Training, Power).
2. **`pnpm price-list:import <file> --ref "Kenac price list 2026-10"`**
   - Upserts the Kenac `Supplier` (`isOperator: true`) and the `CatalogueItem`s.
   - Rows no longer in the file are deactivated, not deleted.
   - Prints counts and rejected rows with reasons.
3. **`findKenacOffers(requirement)`** (`src/lib/pricing/kenac.ts`)
   - Takes the category and constraints the advisor derives.
   - Loads active Kenac items, builds `Offer`s with `OPERATOR_PRICE_LIST` evidence (reference = `priceListRef · sku`, `capturedAt = priceListDate`, `validUntil`), and runs `matchOffers` with `asOf` = now.
   - Returns full fits first; partial fits are clearly marked as unconfirmed.
4. **Advisor tool `find_kenac_price`**, registered via `src/lib/advisor/tools/index.ts`.
   - Input: `{lineId, category, constraints[]}`.
   - Returns up to 3 ranked offers with the fit result and reasons.
   - **The advisor attaches a price only by calling `price_line`** with the returned evidence. Tell it in the tool description:
     - only full fits may be attached;
     - say aloud that the price is from Kenac's price list;
     - never present it as the only option.
   - For public entities (`profile.isPublicEntity`), the result includes `"needsCompetingQuotes": true`, so the advisor mentions alternatives.
5. **Nothing on the price list fits:** the tool returns `{offers: [], suggestion: "Request quotes"}`. The advisor keeps the line unpriced.

## Acceptance criteria
- [ ] Importing the sample CSV in `src/lib/pricing/__fixtures__/` creates the items; a re-import is idempotent.
- [ ] An item that fails a constraint is never returned as attachable (test).
- [ ] An expired item is returned as unusable with an "Expired · request an updated quote" reason.
- [ ] An attached price shows the "Kenac" badge in the UI (via `supplier.isOperator`) and the "Kenac price list" evidence pill.
- [ ] Public-entity flag test.
- [ ] Without a price list imported, the tool returns empty and nothing breaks.
