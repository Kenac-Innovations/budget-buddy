# T9b · Linear-style dark HUD

Dark mode now gives the advisor a near-black, precisely layered plan panel: faint grid, hairline borders, thinner category ring, restrained chart highlights, luminous board-story connections and a soft light behind accepted spend. Changes to the engine total trigger a 600 ms light pulse in both the headline and the pinned spend strip, so the consequence remains visible while editing a line. Spotted proposals receive one scan sweep on arrival. The conversation has a focused command input, a status-event shimmer and a transient streaming edge.

Planning and evidence dates use one tested formatter, including chart tooltips, accessible tables, quote requests, purchase parts and sharing previews. Demo mode starts with the static greeting on a fresh device draft. **Start over** clears the demo draft, plan, transcript, errors and session cookie. Its server action rejects live mode; saved plans retain their data and private return links. The server's demo default and the page now agree; a `?demo` query cannot switch a live screen into a resettable demo.

Branch: `codex/T9b-linear-hud`. Local commits only; no remote or push. All source changes are within T9b's ownership. `globals.css` is additive, with tokens derived using `color-mix()` and transform/opacity keyframes. No new raw colours, dependencies, migrations, model configuration changes, frozen-contract edits or calculation changes.

Implementation commits: `f5059a8` (date formatter), `2a07f48` (demo lifecycle and assistant status), `da58ad6` (dark HUD), `bc4fec2` (sharing dates), `2318aa5` (pinned total pulse). This report and its verification artifacts are committed separately.

## Acceptance criteria

A cross means the criterion is not fully verified, even when its implementation is present.

| Criterion | Result and reason |
| --- | --- |
| Dark mode side by side with linear.app reads as the same calibre: precise, dark, subtle glow, sharp type. Include comparison screenshots. | ❌ Implementation is present: near-black token-derived elevations, a 3% dot grid, hairlines, restrained light, Hanken Grotesk and −0.025/−0.035em heading/total tracking. The required browser comparison and screenshots could not be captured because browser access was denied. This subjective visual gate remains open. |
| Light mode is unchanged in character and still passes the T9 checks. | ❌ HUD styling is scoped to `.hf-theme-dark`; light chart strokes, surfaces, image framing and layout are retained. Existing T9 unit checks pass, including engine derivations, what-if selections, visuals and animated totals. Phone, keyboard, clipboard and light-mode visual checks still require a browser and have not been repeated for this branch. |
| The total, ring, timeline and board-story path animate as described; reduced motion is static. | ❌ Implemented 600 ms total/pinned-total pulses, thin ring highlights, monthly hover light, 400 ms clipped SVG gradient sweeps and a one-time Spotted scan. New motion animates only transform/opacity; no filters. Reduced-motion CSS disables motion and transient light; the existing total test confirms synchronous final values without animation frames. Actual browser motion, hover sweeps and 60 fps behaviour remain unverified. |
| All dates in the advisor UI are human-formatted; no YYYY-MM rendered strings; formatter has tests. | ✅ Shared formatter covers months, compact ranges, dated evidence, source dates, quote timing and sharing dates. Tests cover cross-year/single-month ranges, timestamp calendar days, leap years and invalid dates. Rendered plan and sharing-preview regression tests reject ISO month strings. Source audit found no remaining raw structured date fields rendered in advisor components. Plan data, API values and free-form user/model text retain their original content. |
| Demo first visit shows the greeting; Start over resets cleanly. | ✅ SSR tests confirm the instant greeting, Kenac disclosure and demo-only reset control. Production HTTP checks exercise two streamed turns, accepts, the real reset server action, cookie expiry, invalidation of the old token and a clean next turn. Unit tests cover refusing live mode, preserving saved plans and failure handling. Client state/local draft reset is implemented; clicking the action in a browser remains part of the manual check. |
| pnpm test, pnpm test:evals, pnpm typecheck, pnpm lint and pnpm build pass. | ✅ 247 unit tests across 47 files; 62 eval tests across 6 files; typecheck, lint and production build pass. Demo runtime used an in-memory store and no OpenAI key. No live-model judging or database operation was attempted. |
| Report includes dark HUD desktop, phone and detail-sheet screenshots, plus a short turn recording with total pulse and path-hover sweep. | ❌ No new screenshots or recording were captured. Existing T9 screenshots are not represented as T9b evidence. Browser approval is needed to finish these artifacts. |

## Verification evidence

- [Production protocol checks](T9b-assets/runtime-checks.json): greeting, fresh session, two streamed turns, five demo lines, attached product image, three persisted accepts, reset action, expired cookie, invalidated old token and a clean first turn after reset. Checks contain booleans/counts only. The HTTP checker explicitly carried the production Secure cookie on the local HTTP connection; it did not change cookie security.
- [Dark palette contrast audit](T9b-assets/contrast-checks.json): minimum **4.73:1** across ink, secondary ink and brand text on dark HUD/status surfaces. Includes a conservative peak of three overlapping 12% light layers. This is an sRGB token/compositing calculation, not browser pixel sampling; glow never fades the text itself.
- All five required commands passed after the final source changes. The initial fresh-worktree typecheck lacked Next's generated `LayoutProps`; `pnpm build` generated the route types and subsequent typechecks passed. Vitest emits its existing config-loader advisory; lint emits no warnings.
- Port 3210 was used for runtime checks and stopped. No task server remains running.

The references were opened through the read-only web tool: [Linear](https://linear.app/), [Raycast](https://www.raycast.com/) and [Warp](https://www.warp.dev/). The brief's stated visual qualities guided the implementation; no assets, logos or code were copied. Screenshot comparison is outstanding.

## Browser blocker

Chrome's browser connector failed to load its request-header policy. Native Chrome access was then denied. Automatic approval review rejected opening the same public reference in the in-app browser because it considered that a bypass after Chrome denial and said that the alternate approach lacked user authorization. No indirect browser/desktop workaround was used. A permission question was submitted to allow Chrome or the in-app browser for the public reference and local demo; no answer arrived during implementation.

## Manual test script (pending browser access)

1. Run `ADVISOR_MODE=demo ADVISOR_DEMO_HUD=1 DATABASE_URL= OPENAI_API_KEY= APP_URL=http://localhost:3210 pnpm dev --port 3210`. Open `http://localhost:3210/` with a fresh demo draft. Confirm the greeting appears immediately and there is no Welcome back message. Follow-system remains the initial theme choice; the toggle tooltip includes “Dark: HUD mode”.
2. Send “180 staff, four new branches. The board wants fewer outages.” Then send “Mostly power; ZESA cuts.” Watch readable proposals arrive during text, Spotted items scan once and the advisor's thin edge fade when streaming ends. Before the first text, the short status line should shimmer, with no dots or invented branch-specific status.
3. Switch to dark mode. Compare the desktop HUD beside `linear.app` at the same viewport. Capture both for the report. Focus the composer and check its subtle light and Enter/Shift+Enter hint. Check image framing beside the category illustrations.
4. Accept the power initiative and the three priced demo lines. Confirm US$22,440 so far from the existing engine. Increase the solar quantity and defer/fund power; confirm the total, ring and monthly cash profile respond. Record a turn, an accept/quantity change with the visible headline or pinned-total pulse, and a 400 ms path-hover sweep. Hover/focus objective, initiative and line nodes; the complete relevant path should light, while other text remains legible.
5. Explore a month and category by pointer and keyboard. Confirm chart titles/tables say Mar 2027 and the period says Jan–Dec 2027. Open the solar detail sheet; check captured/validity dates, purchase parts and the human date in the copied quote request. Test Tab wrapping, Escape and focus return.
6. Repeat at 360×800 in light and dark mode. Open the plan, then the detail sheet; ensure no horizontal overflow and Escape leaves the outer plan open. Capture dark phone and detail-sheet screenshots. Repeat proposal readability, quantity, estimate, set-aside/restore and clipboard checks from T9.
7. Enable reduced motion, repeat accept/defer/quantity changes and hover paths. Values must reach their final states immediately, with no scan, pulse, shimmer, sweep or movement. Measure frame performance and browser text contrast before signing off the visual criteria.
8. Select Start over. Check the empty plan, greeting, cleared draft/history and first scripted turn. Reload and confirm the reset does not revive prior decisions. Check that a live-mode screen offers no reset, and that saved demo plans keep their private return links. Stop port 3210.

## T8 integration

- Complete the blocked comparison, desktop/phone/detail screenshots, motion recording, phone/keyboard checks and performance sampling. Update the cross-marked criteria only after that evidence exists.
- Keep `ADVISOR_DEMO_HUD=1` for the rich illustrated demo; the stable default fixture is unchanged. Reset follows the server's `ADVISOR_MODE`, rather than trusting query parameters.
- Review the existing T9 integration notes for what-if/export alignment, remote-image CSP, product-fit metadata, SKU limits and the earlier catalogue migration. T9b does not alter those contracts or resolve those separate integration decisions.
- Next's Server Action provides the cookie-ownership and same-origin boundary for demo reset. It has no caller-supplied token/mode and no model call. Saved plans are detached from the current demo cookie, while their return links remain usable.
