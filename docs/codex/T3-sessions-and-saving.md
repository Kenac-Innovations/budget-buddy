# T3 · Sessions, user plan ops, saving at wrap-up, email, return link

**Branch:** `codex/T3-sessions-and-saving` · **Wave 1** · Read `AGENTS.md`, `docs/user-journey.md` (stages 1, 6, 8, "If they leave early") and `docs/build-plan.md` first.

## Goal
Make the conversation durable and anonymous until the end; save it with the CTO's details at wrap-up; send the plan by email; let them come back.

## You own
`prisma/**` (migrations), `src/lib/session/prisma-store.ts`, `src/lib/session/index.ts` (the `getSessionStore()` factory), `src/app/api/plan/**`, `src/app/api/session/**`, `src/app/r/**`, `src/lib/email/**`, `src/components/advisor/save-form.tsx`.

## Use (don't change)
`src/lib/session/store.ts` (interface), `src/lib/plan/{types,ops}.ts`.

## Allowed new dependencies
`nodemailer` + `@types/nodemailer`.

## Build

1. **Migration** for the `AdvisorSession` model already in `prisma/schema.prisma` (`pnpm exec prisma migrate dev --name advisor_session`).
2. **`PrismaSessionStore implements SessionStore`.**
   - Validate `plan` with zod on every read and write.
   - Optimistic version check on writes: reject an older `plan.version`.
   - `getSessionStore()` returns Prisma when `DATABASE_URL` is set, otherwise in-memory. Export a single instance (T1 imports it).
3. **Cookie helpers** (`src/lib/session/cookie.ts`): read and set `bb_session` (httpOnly, Secure in production, SameSite=Lax, 30 days). Sessions are created **lazily on the first user message** (T1 calls `getOrCreate`), never on page view.
4. **`POST /api/plan/op`** `{op: PlanOp}`.
   - Loads the session from the cookie and runs `applyOp(plan, op, "user")`; on success, `updatePlan` and return `{plan}`.
   - 400 with the reducer's error; 409 on a version conflict (the client refetches).
   - **`GET /api/plan`** returns `{plan, messages: <display-only transcript>, saved}` for resuming.
   - The transcript is user and assistant text only. Never return tool internals.
5. **Resume:** on page load with a cookie, T2 calls `GET /api/plan`. If there are messages, the advisor's turn-1 greeting is replaced by "Welcome back." plus the history. (Agree the component props with T2 in your PR.)
6. **Save at wrap-up**
   - **`POST /api/session/save`** `{name, email, organisation, role, consentEmail: true, consentContact: boolean}`.
   - Validate with zod: a real email shape and lengths. `consentEmail` must be true to save; `consentContact` defaults to false.
   - Store the details and `savedAt`.
   - Send the email: a plain-text and simple HTML version in the Humaflow voice, containing the return link `APP_URL/r/<token>` and a one-line summary. Attach the Excel file **if** T5's `buildWorkbook(plan)` exists (feature-detect the import; otherwise link to `/api/export/xlsx`).
   - **SMTP from env:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. If SMTP isn't configured, skip sending and return `{emailed:false, returnUrl}` so the UI shows the link to copy.
   - **`save-form.tsx`**: the form that goes inside T2's `WrapUpCard`.
     - fields: name, work email, organisation, role (select: CIO, CTO, CSO, ICT manager, Other);
     - checkbox ☑ "Email me my plan and the Excel file" (required);
     - checkbox ☐ "Kenac may contact me about items I choose to share" (unticked);
     - button "Save my plan";
     - success state: "Saved. I've sent it to you@…" or "Saved. Keep this link to come back: …" (copy button).
7. **`GET /r/[token]`:** if the token matches, set the cookie and redirect to `/`. Otherwise go to `/` with a calm "That link has expired" notice. Rate-limit with T6's helper if available.
8. **Header state:** expose `saved` so T2 shows "Not saved yet" or "Saved".

## Acceptance criteria
- [ ] Refresh mid-conversation: the history and plan resume. A new browser: fresh session.
- [ ] No session row exists until the first message is sent.
- [ ] User ops persist; the advisor's next turn sees accepted and dismissed states.
- [ ] Save without email consent is rejected. Contact consent defaults to false and is stored exactly as given.
- [ ] Without SMTP, the save still succeeds and shows the return link. With SMTP (use a test transport in tests), the email contains the link.
- [ ] The return link restores the session on another device.
- [ ] Store tests: the version conflict, zod rejection of a corrupt plan, round-trip.
- [ ] No emails or names in logs.
