# T9b · Linear-style dark HUD

**Branch:** `codex/T9b-linear-hud` · Builds on T9 (already merged). Read `AGENTS.md`, `docs/user-journey.md` (the Jarvis brief), `docs/design-system.md`, `docs/codex/T9-plan-hud.md`, `docs/codex/T9-visual-references.md` and `docs/codex/reports/T9.md` first. Then study the current `src/components/advisor/**`.

## Goal
The product owner wants Budget Buddy to **look futuristic and tech-savvy** while staying credible to a CIO, CTO and CSO. Make **dark mode the "HUD mode"**: Linear-grade precision for the plan panel, a Raycast/Warp-like assistant feel for the conversation, and Ubiquiti-grade product imagery (already in place from T9). Light mode stays calm Humaflow; keep it working and tidy, but the wow goes into dark mode.

## References (study the qualities; don't copy assets, logos or code)

| Reference | What to take |
|---|---|
| **linear.app** | **The main reference.** Near-black surfaces with subtle elevation; hairline borders; restrained glow (soft radial light behind key elements); very sharp typography with tight tracking on headings; the product UI itself as the hero; fast, purposeful motion; generous negative space. |
| **raycast.com**, **warp.dev** | The assistant feel for the conversation pane: keyboard-first, a focused input that glows subtly on focus, compact command-like affordances, "thinking" states that feel alive (a shimmer, not a spinner). |
| **store.ui.com** | Already applied by T9 for product visuals. Keep one curated framing for every image. |

## You own
`src/components/advisor/**`, `src/app/page.tsx` (only if needed), `src/app/globals.css` (additive: new dark-only utilities and keyframes), `public/illustrations/**`, `src/lib/advisor/fixtures.ts` (demo content only).

## Don't change
Contracts (`src/lib/plan/*`, `src/lib/advisor/events.ts`, `src/lib/session/store.ts`), the engine, the evidence policy, the generated `src/styles/tokens.css`, or anything under `design-system/`.

## Allowed new dependencies
None. SVG, CSS and the Web Animations API only.

## Build

1. **HUD tokens for dark mode only.** Define them in `globals.css` under `.hf-theme-dark`, derived from existing tokens with `color-mix()`. No new raw hex except near-black elevation steps if truly needed (document why):
   - `--hud-glow`: brand at low alpha;
   - `--hud-hairline`;
   - `--hud-elev-1/2`;
   - `--hud-grid`: a faint dot or line grid for the plan background, under 4% opacity.
2. **Plan panel in HUD mode**
   - **Surfaces:** a near-black panel with a very faint grid behind the plan, and cards one elevation step up with hairline borders.
   - **The total:** large, tight-tracked numerals with a soft radial glow behind it. When it changes, it counts up (as today), with a brief glow pulse.
   - **The ring and timeline:** thin strokes with a subtle glow on the active or hovered segment; gridlines as hairlines; chart colours remain `chart-1…5` in order.
   - **The board story:** connector lines become thin luminous traces. Hovering a path lights it up end to end (a gradient sweep along the SVG path, about 400 ms).
   - **"Spotted" items:** a soft scan-line or shimmer sweep once when they arrive, then a quiet marker.
3. **Conversation pane in HUD mode**
   - The composer glows subtly on focus, with a Raycast-style command hint below it ("Enter to send · Shift+Enter for a new line").
   - The "thinking" state is an animated shimmer on a short status line ("Thinking about your branches…" uses the existing `status` event; never invent content), not dots.
   - Advisor messages get a thin brand-coloured left edge **only while streaming**, which fades when done. (This is a transient state indicator, not a card stripe, so the Humaflow "no accent stripes" rule still holds.)
4. **Type:** keep Hanken Grotesk. Tighten tracking on the big total and section titles in HUD mode (−0.02 to −0.035em, per the Humaflow wordmark and page-title specs). Use tabular numerals throughout.
5. **Default theme for the advisor screen:** keep "follow the system" as the default. Add a small "HUD" hint on the theme toggle tooltip ("Dark: HUD mode").
6. **Follow-ups from T9's review (required)**
   - **Human dates everywhere in the advisor UI:** "Mar 2027" and "Jan–Dec 2027", never "2027-03" or "2027-01 – 2027-12". One shared formatter with tests.
   - **Demo restarts cleanly:** a first visit in demo mode must start with the greeting, not "Welcome back". Add a quiet "Start over" action (demo mode only) that clears the demo draft and session, so a presenter can reset between audiences.
7. **Performance and access**
   - Animate only `transform`, `opacity` and filter-free glows (prefer `box-shadow`/`radial-gradient` on pseudo-elements with opacity).
   - 60fps on a mid-range laptop.
   - Everything is static under `prefers-reduced-motion`.
   - Text contrast ≥ 4.5:1 on the dark surfaces; check the glow never reduces it.

## Acceptance criteria
- [ ] Dark mode side by side with linear.app reads as the same calibre: precise, dark, subtle glow, sharp type. Include the comparison screenshots in the report.
- [ ] Light mode is unchanged in character and still passes the T9 checks.
- [ ] The total, ring, timeline and board-story path animate as described; reduced motion is static.
- [ ] All dates in the advisor UI are human-formatted (grep shows no `YYYY-MM` rendered strings); the formatter has tests.
- [ ] Demo first visit shows the greeting; "Start over" resets cleanly.
- [ ] `pnpm test`, `pnpm test:evals`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
- [ ] The report includes screenshots of dark HUD desktop, phone and the detail sheet, plus a short recording of a turn with the total pulse and a path-hover sweep.
