# T8 · Integration, wow pass and release

**Branch:** `codex/T8-integration` · **Wave 3** (after T1–T7 are merged) · Read everything in `docs/` first.

## Goal
Turn seven merged workstreams into one experience that passes the demo script and the release gate, then ship it to 3 CTOs.

## Build
1. **Wire everything:**
   - the real advisor route behind the UI;
   - the Prisma store;
   - save + email + Excel;
   - sharing;
   - the Kenac pricing tool;
   - security headers.
   Remove dev-only fallbacks that are no longer needed.
2. **Run the demo script** (`docs/build-plan.md` section 6) on a phone and a laptop, light and dark. Fix everything that breaks the flow or the feel.
3. **Run `pnpm eval --mode live`.** Fix the prompt and tools until the gate passes. Commit the report.
4. **Wow pass:**
   - timing of the plan animations against the text;
   - the "Spotted" moment;
   - the total ticking up;
   - empty and loading states;
   - copy consistency with the Humaflow voice;
   - the wrap-up card;
   - the email;
   - Excel styling.
5. **Release:**
   - deploy with `deploy/k8s` (or the temporary host if the data centre isn't ready);
   - set `ADVISOR_MODE=live`;
   - smoke test `/api/health`;
   - write `docs/release-notes-beta.md` (what's in, known gaps, how to give feedback).

## Acceptance criteria
- [ ] The demo script passes end to end. A recording is attached to the PR.
- [ ] The eval gate passes. The report is committed.
- [ ] The CSO checklist in `docs/security.md` is complete, with gaps stated.
- [ ] The beta URL works on a phone over mobile data.
