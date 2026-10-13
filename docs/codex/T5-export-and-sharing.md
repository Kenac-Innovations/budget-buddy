# T5 · Excel export, sharing with Kenac, Kenac view

**Branch:** `codex/T5-export-and-sharing` · **Wave 2** (after T3 is merged) · Read `AGENTS.md`, `docs/user-journey.md` (stages 6 and 7) and `docs/build-plan.md` (W6) first.

## Goal
1. An Excel workbook a CIO can hand to Finance without editing: it looks like a consultant made it.
2. Per-line sharing with Kenac, with an exact preview.
3. A minimal protected Kenac view of shared lines only.

## You own
`src/lib/export/**`, `src/app/api/export/**`, `src/app/api/share/**`, `src/app/kenac/**`, `src/components/advisor/share-panel.tsx`.

## Use (don't change)
`src/lib/plan/{types,ops,totals}.ts`, `src/lib/session`, `src/components/ui/*`, `src/components/ui/status-pill.tsx` labels.

## Allowed new dependencies
`exceljs`.

## Build

1. **`buildWorkbook(plan, meta): Promise<Buffer>`** (`src/lib/export/workbook.ts`). Sheets:
   1. **Summary:**
      - organisation and role (if saved), period, reporting currency, date generated;
      - planned spend **so far**, with the count of unpriced lines;
      - objectives with their measures;
      - a "How to read this" note.
   2. **Budget by objective:**
      - grouped rows: Objective → Initiative (disposition) → lines;
      - columns: Item, Category, Qty, Unit, Frequency, Timing, Unit price, Currency, Evidence, Supplier, Period total;
      - subtotals per objective, using **formulas** so Finance can adjust them;
      - Unpriced shown as "Unpriced", never 0.
   3. **Monthly cash profile:** months × lines, from the engine.
   4. **Evidence register:** each priced line, its evidence type, reference, date and validity.
   5. **Open questions:** unpriced lines, Investigate initiatives, and cautions.
   - **Styling:**
     - Humaflow navy `#123347` header fills with white text, Hanken Grotesk (fallback Calibri);
     - tabular number formats `#,##0.00`;
     - frozen headers, sensible column widths, print setup (landscape, fit to width).
   - Only **accepted** items appear. Proposed items are listed on Open questions as "Not yet decided".
   - Add a footer: "Prepared with Budget Buddy, an AI advisor run by Kenac Computer Systems. Prices are sourced as shown; unpriced items are excluded from totals."
2. **`GET /api/export/xlsx`**: session cookie → workbook download `ICT-plan-2027.xlsx`. Also export `buildWorkbook` for T3's email attachment.
3. **Sharing (`share-panel.tsx`, shown after saving and on request)**
   - A list of accepted lines with a toggle "Share with Kenac" and a nested checkbox "Include my budget for this item" (unticked by default).
   - **Preview** shows exactly what Kenac would see: item, quantity, unit, timing, category, notes, plus the organisation and contact **only if** `consentContact` was given, and the allocation only if ticked.
   - The confirm button reads "Share N items with Kenac".
   - Uses `set_sharing` ops via `POST /api/plan/op`.
4. **Kenac view `/kenac`**
   - Protected by `KENAC_VIEW_TOKEN` (bearer header or a one-time login form that sets an httpOnly cookie).
   - A table of shared lines across saved sessions:
     - organisation and contact only where `consentContact`;
     - allocation only where `shareAllocation`;
     - shared date;
     - **never** unshared lines, the conversation or the rest of the plan.
   - CSV download of the same.
   - Add an access log line per view (no personal data in logs; log the count only).

## Acceptance criteria
- [ ] The workbook opens cleanly in Excel and LibreOffice. Formulas recalculate. Unpriced is never 0. Grouping and subtotals are correct (golden test on the demo plan: snapshot the sheet values).
- [ ] Proposed or dismissed items are excluded from totals.
- [ ] The preview matches the Kenac view row for row (test).
- [ ] Unsharing removes the line from `/kenac` immediately.
- [ ] `/kenac` without the token returns 401; it never shows unshared data (test with a mixed fixture).
- [ ] Screenshots of each sheet in the PR.
