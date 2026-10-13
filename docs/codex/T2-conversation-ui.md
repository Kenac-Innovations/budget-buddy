# T2 · Conversation and living plan UI (the wow)

**Branch:** `codex/T2-conversation-ui` · **Wave 1** · Read `AGENTS.md`, `docs/user-journey.md`, `docs/build-plan.md` (section 1, "Wow") and `docs/design-system.md` first.

## Goal
The single screen the CTO lives in: **the conversation on the left, the living plan on the right**. It should feel like Jarvis: quiet, precise and alive. The plan builds itself while the advisor talks. This screen is the first impression for a CIO, CTO and CSO, and it has to be the best work in the repo.

## You own
`src/app/page.tsx` (becomes the advisor screen), `src/app/(advisor)/**`, `src/components/advisor/**`.

Move the existing sample budget page to `src/app/sample/page.tsx` and point the shell nav at it.

## Use (don't change)
`src/lib/advisor/events.ts` (`readEvents`, `OPENING_MESSAGE`, `AdvisorEvent`), `src/lib/plan/{types,ops,totals}.ts`, `src/components/ui/*`, the Humaflow tokens.

## Allowed new dependencies
None. Use CSS transitions and keyframes (respect `prefers-reduced-motion`).

## Build

1. **Layout**
   - **Desktop:** conversation (about 44%) | plan (about 56%), full height, no app sidebar. A slim top bar: the wordmark "Budget Buddy" with "by Kenac Computer Systems", the session state ("Not saved yet" or "Saved"), and the theme toggle.
   - **Phone (<900px):** the conversation is full screen; the plan opens as a bottom sheet from a sticky "Your plan · 3 objectives · US$… so far" bar.
   - **Permanent footer:** "AI advisor run by Kenac · Your plan is private · How we handle data", linking to `/privacy` (T6 builds the page).
2. **Conversation**
   - `OPENING_MESSAGE` renders instantly on first paint (server-rendered, no fetch).
   - Composer: autosizing textarea, Enter to send, Shift+Enter for a new line, disabled while a turn streams, with a Stop button that aborts the fetch.
   - Streaming text renders word by word; a calm three-dot "thinking" state while `status` is `thinking` and no text has arrived yet.
   - Advisor messages: plain text with light markdown (bold, lists only). User messages are right-aligned and quieter.
   - **Error event:** "I lost my train of thought. Try again?" plus a Retry button. Ops already applied stay applied.
   - **`wrap_up` event:** an inline **wrap-up card** in the conversation: the summary, then a slot T3 fills with the save form. Until T3 lands, render a placeholder `WrapUpCard` component with a `children` slot.
3. **Living plan (the HUD)**
   - Three sections: **Objectives → Initiatives (grouped under their objective) → Budget**.
   - **Each `op` event applies locally with `applyOp`** (the same reducer as the server) and animates in:
     - new items slide and fade in;
     - updated fields briefly highlight in `brand-soft`;
     - `proactive` and `forgottenCost` items show a small "Spotted" marker (lucide `Sparkles`, 14px, `teal` is NOT allowed; use brand).
   - Replace the local plan with `done.plan` at the end of each turn.
   - **Initiative card:**
     - title;
     - disposition chip (Fund · Pilot · Investigate · Defer, as Humaflow StatusPill-style chips: Fund green, Pilot slate, Investigate amber, Defer grey);
     - rationale;
     - caution in a muted line starting "Watch out:";
     - sources as small dated links ("Kenac trend brief · Oct 2026");
     - buttons **Accept** and **Not now** (with an optional reason popover).
   - **Budget lines:**
     - title, quantity/unit, timing, evidence pill (`EVIDENCE_STATUS`, "Unpriced" when there's no price), the line total (from `planTotals`), the "Kenac" badge when the supplier `isOperator`;
     - Accept / Not now;
     - "Add my own estimate" opens an inline form (unit price + currency) that sends `price_line` with `USER_ESTIMATE` and reference = "Own estimate".
   - **User actions** call `POST /api/plan/op` (T3) with `{op}`. Apply optimistically with `applyOp(…, "user")` and roll back on error. Until T3 lands, keep them local.
   - **Header total:** "US$68,285 so far · 4 unpriced", animating between values. Show "Planned spend" without "so far" only when `complete`.
   - **Empty states:** before turn 1, a faint skeleton of the three sections with one line, "Your plan builds here as we talk."
4. **Demo mode:** a `?demo` query or `ADVISOR_MODE=demo` uses the same route (T1 serves scripted turns). Until T1 merges, read `scriptedTurn()` client-side behind a dev-only flag.
5. **Polish bar**
   - Hanken Grotesk, tabular figures, Humaflow spacing.
   - Dark mode looks deliberate: HUD-like, charcoal surfaces, light grey-blue accents.
   - Focus rings, ARIA live region for streamed text, keyboard reachable everything.
   - 60fps animations, no layout jump while streaming.
   - Works at 360px.

## Acceptance criteria
- [ ] The greeting is visible in the first HTML response (view source).
- [ ] In demo mode, the two scripted turns animate items in **while** text streams; the final plan equals the server's `done.plan`.
- [ ] Accept, Not now (with reason) and own estimate update the plan and totals; Unpriced lines never show US$0.
- [ ] The wrap-up card appears on a `wrap_up` event.
- [ ] Phone: the plan sheet opens and closes; nothing overflows at 360px. Dark mode checked.
- [ ] Reduced motion: no slide animations.
- [ ] No hard-coded colours (grep for `#` in your components returns nothing).
- [ ] The PR includes screenshots: desktop light, desktop dark, phone, plus a short screen recording of turn 2 animating.
