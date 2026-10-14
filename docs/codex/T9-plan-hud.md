# T9 · The plan HUD: make the living plan the wow

**Branch:** `codex/T9-plan-hud` · Read `AGENTS.md`, `docs/user-journey.md` (the Jarvis brief), `docs/build-plan.md` (section 1, "Wow") and `docs/design-system.md` first. Then study the current `src/components/advisor/plan-view.tsx` and `advisor-screen.tsx`.

## Goal
The right-hand plan is where a CIO, CTO and CSO actually look. Today it's a quiet list. Turn it into a **live, interactive heads-up display**, the thing people screenshot and show their board. It should feel like Jarvis: precise, alive, calm. No gimmicks.

**Every animation must show cause and effect** (accept something → the total moves; the advisor spots something → it glows into place). Motion is short (120–600 ms), physically sensible, and fully disabled under `prefers-reduced-motion`.

## You own
- `src/components/advisor/plan-view.tsx`, plus new files under `src/components/advisor/plan/**`;
- `src/components/advisor/advisor.css`;
- `public/illustrations/**` and `public/catalogue/demo/**`;
- `src/lib/advisor/fixtures.ts` (demo content only; keep it passing the plan-ops tests).
- Small, additive changes to `advisor-screen.tsx` to wire new interactions.
- For product images from the price list: an optional `image_url` column in the price-list import (`src/lib/pricing/**`, `scripts/import-price-list.ts`, `docs/price-list-format.md`, plus a migration generated with `prisma migrate diff` as before). `find_kenac_price` must pass `product {sku, name, imageUrl}` into the offer so the advisor can attach it with `price_line` (the `LinePrice.product` field already exists).

## Don't change
`src/lib/plan/{types,ops,totals}.ts`, `src/lib/advisor/events.ts`, the engine, the evidence policy. Plan changes still only go through `applyOp` and `POST /api/plan/op`.

## Allowed new dependencies
**None.** Use SVG, CSS transitions and keyframes, and the Web Animations API. Charts are hand-built SVG.

## Build

1. **Budget display at the top of the plan**
   - **The total counts up** to the new value (about 600 ms, eased). It reads "US$68,285 so far" while anything is unpriced and "Planned spend" when complete. Use `planTotals()` only, never your own arithmetic.
   - **A category ring** (SVG donut) of accepted, priced spend by category, using `chart-1…chart-5` **in order** (the order matters for colour-blind readers), with a legend. Segments animate when values change. Hovering a segment highlights those lines.
   - **A completeness bar:** priced vs unpriced lines, with the label "4 of 7 lines priced".
   - **A ceiling gauge** if `profile` has a ceiling. If not, show a quiet "Set a ceiling" affordance that does nothing yet (labelled as coming soon). Don't invent a ceiling.
2. **Lines connected to objectives (the board story)**
   - Objectives → initiatives → lines, drawn with subtle SVG connector lines.
   - Hovering or focusing any node highlights its full path and dims the rest.
   - Each objective shows its share of spend.
3. **What-if toggles**
   - On each **accepted** initiative, a Fund ↔ Defer toggle that sends `update_initiative {disposition}` via the existing user-op path.
   - Deferred initiatives' lines are excluded from the what-if total. Compute this in the UI by filtering accepted lines whose initiative is deferred, **then** running `planTotals` on that filtered plan copy.
   - The total, the ring and the timeline re-animate.
   - The header shows "Deferring saves US$X" when anything is deferred.
   - **Check first:** confirm `update_initiative` is a user-allowed op in `ops.ts`. If it isn't, don't change the contract; implement the toggle as a local what-if view and list the contract question in your report.
4. **Monthly cash timeline:** 12 SVG bars from `planTotals().reportingMonthly`. The bars grow in on change; hovering a month lists that month's payments. Respect a custom period length.
5. **Line cards**
   - **A visual on the left:**
     - **the product photo** (`price.product.imageUrl`) only when the line is priced from the Kenac price list, with an "Kenac" badge and the product name;
     - otherwise **a category illustration**.
   - **Illustrations:** create a consistent SVG set in `public/illustrations/categories/` in Humaflow style (navy line art on `brand-soft`, rounded, 1.5px strokes, no text). Cover at least: hardware (laptop), servers, networking, connectivity, power (solar/UPS), cybersecurity (shield), cloud, software/licences, professional services, training, support. Map categories to them with a fallback.
   - **Also on the card:** the evidence pill, quantity × unit, timing chip, line total, and a "Forgotten cost" or "Spotted" marker.
   - **Inline edits:** a quantity stepper (sends `update_line`) and "Add my own estimate" (already exists; keep it).
   - **Clicking a card opens a detail sheet** (right-side drawer on desktop, bottom sheet on phone), with:
     - a large visual;
     - the specs (`note`, unit, frequency, months);
     - the evidence (type, reference, date, validity);
     - the fit statement if Kenac-priced;
     - **"Request a quote"**, which copies a short, neutral quote request (item, quantity, timing, spec) to the clipboard, with a "Copied" confirmation;
     - Accept / Not now.
6. **Moments**
   - New items **fly in from the conversation side** (a short translate + fade from the left edge) as their `op` event arrives.
   - **"Spotted"** (`proactive` / `forgottenCost`) items get a brief brand-colour glow that settles into a small marker.
   - Accepting an item **checks it in** with a crisp tick animation. The total animates.
7. **Readability fix (required):** proposed items are currently drawn too faded to read.
   - Proposed items must be **fully legible**: full-contrast text, a dashed `brand-border` outline, and an "Awaiting your decision" chip.
   - Dismissed items collapse into a compact "Set aside (3)" group that can be expanded and restored.
8. **Demo content** (`fixtures.ts`): extend the scripted turns so demo mode shows the wow.
   - At least one Kenac-priced line with a **demo product image** (create tasteful illustrative renders as SVG or WebP in `public/catalogue/demo/`, clearly generic with no brand logos; label them "Illustration" in the UI).
   - Several categories, so the ring is meaningful.
   - A proactive catch.
   - Enough lines that the timeline has shape.
   - Fixture prices must use documented evidence types (the Kenac price list, labelled as demo data: reference "Demo price list · not real prices").
   - Keep all plan-ops tests passing.

## Quality bar
- Humaflow tokens only: no hard-coded colours (except inside the illustration SVG files, which use the navy and brand-soft hex values).
- Works at 360px. On a phone, the HUD stacks: total → ring and completeness → timeline → tree.
- Dark mode is deliberate.
- **Keyboard:** every interactive node is focusable; the drawer traps focus and closes on Escape.
- **Screen readers:** the ring and timeline have accessible text equivalents (a visually hidden table).
- 60fps. No layout shift while streaming. Animate only `transform` and `opacity`.
- **Performance:** no re-render storms during text streaming; memoise the plan derivations.

## Acceptance criteria
- [ ] In demo mode, a full run shows: items flying in during the reply, the Spotted glow, the total counting up on accept, the ring and timeline animating, a Kenac product photo on a priced line, illustrations on the others.
- [ ] Fund ↔ Defer changes the total, the ring and the timeline, and shows "Deferring saves US$X". No invented numbers; everything comes from `planTotals`.
- [ ] Proposed items are fully legible (contrast ≥ 4.5:1 for text) with the "Awaiting your decision" chip. Set-aside items are grouped and restorable.
- [ ] The detail sheet works with the keyboard and on a phone; "Request a quote" copies the text.
- [ ] Reduced motion: no movement, and the final states are correct.
- [ ] The price-list import accepts an optional `image_url`; `find_kenac_price` returns the product; a test shows a Kenac-priced line keeps `product.imageUrl` through `price_line`.
- [ ] `pnpm test`, `pnpm test:evals`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
- [ ] The report includes screenshots (desktop light and dark, phone) and a short recording of turn 2 plus an accept and a defer toggle.
