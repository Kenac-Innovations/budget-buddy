# T6 · Trust, security and deployment (CSO acceptance)

**Branch:** `codex/T6-trust-security-deploy` · **Wave 1** · Read `AGENTS.md`, `docs/decisions.md` (D1, D5) and `docs/build-plan.md` (section 1, acceptance) first.

## Goal
A CSO who looks under the hood should find a careful platform: an honest data-handling page, hardened HTTP, abuse limits, minimal logs, enforced retention, and a deployable build for the Kenac data centre.

## You own
`next.config.ts`, `src/proxy.ts` (Next 16 renamed middleware to proxy; read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`), `src/app/privacy/**`, `src/lib/security/**`, `src/lib/log.ts`, `src/app/api/health/**`, `deploy/**`, `Dockerfile`, `.dockerignore`, `scripts/retention.ts`, `docs/security.md`.

## Allowed new dependencies
None (write a small in-memory limiter).

## Build

1. **`/privacy`, "How we handle your data"**, in the Humaflow voice, short and exact:
   - **Who runs it:** Kenac Computer Systems; where it's hosted (Kenac data centre).
   - **What we store:** the conversation and plan; contact details only if you save.
   - **What goes to OpenAI:** the conversation text, to generate replies, under OpenAI's API data terms. *Confirm the current wording of OpenAI's API data-use policy and link it. Don't claim anything you can't link.*
   - **What Kenac sees:** only lines you share, plus contact details only if you tick the box.
   - **Retention:** unsaved sessions deleted after 30 days; saved plans kept until you ask us to delete them.
   - **How to delete:** a "Delete my plan" button (calls `DELETE /api/session`; coordinate with T3, which owns the session routes; implement in `src/app/api/session/delete` only if T3 agrees in its PR).
   - The legal basis under Zimbabwe's Cyber and Data Protection Act, and a contact email. Mark `TODO(legal)` where Kenac must confirm.
2. **HTTP hardening** (`next.config.ts` headers):
   - a strict CSP (self; Google Fonts are served by next/font, so self-hosted; no inline scripts except the theme script, which needs a nonce or hash; make it work);
   - HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (microphone=(self) for the coming voice feature, camera=());
   - `X-Frame-Options: DENY`.
3. **Abuse limits** (`src/lib/security/rate-limit.ts`, applied in `src/proxy.ts` or per route):
   - `/api/advisor/turn`: 20 turns per 10 minutes per session and 60 per IP;
   - `/api/session/save` and `/r/*`: 10 per 10 minutes per IP;
   - body size cap of 16 KB on JSON routes;
   - calm 429 copy: "Let's pause for a moment. Try again in a few minutes."
   - Note in `docs/security.md` that the in-memory limiter is per replica, and when to move to Redis.
4. **Logging** (`src/lib/log.ts`):
   - structured JSON (`event`, `sessionId` hash, `route`, `status`, `ms`);
   - a redaction helper that drops message text, emails and names;
   - replace any `console.log` in API routes with it.
5. **Retention** (`scripts/retention.ts`, `pnpm retention`): deletes unsaved sessions older than 30 days, prints counts. Add a k8s CronJob.
6. **Health:** `GET /api/health` → `{ok, db: "up"|"down", model: "configured"|"missing"}`. No secrets.
7. **Env validation** (`src/lib/env.ts`): zod-parse env at startup. Fail fast in production when `OPENAI_API_KEY`, `DATABASE_URL` or `APP_URL` are missing in live mode.
8. **Deploy:**
   - a multi-stage `Dockerfile` (Next standalone output, non-root user, `prisma migrate deploy` on start via an entrypoint);
   - `deploy/k8s/`: Deployment (2 replicas, readiness and liveness on `/api/health`, resources), Service, Ingress with TLS placeholders, Secret template, retention CronJob;
   - match the conventions in `~/VSCProjects/kenac-gitops` if accessible (ArgoCD app manifest); otherwise leave a README with the values Kenac must fill in.
9. **`docs/security.md`, the CSO checklist:** data flows diagram, threat list (prompt injection, data leakage between sessions, scraping the Kenac view, session theft), each mitigation and where it lives, and known gaps.

## Acceptance criteria
- [ ] securityheaders.com-style check: A or better locally (list the headers in the PR).
- [ ] CSP has no `unsafe-inline` for scripts; the theme script still works; no console CSP violations on the main screen.
- [ ] Rate limits return 429 with the calm copy (tests).
- [ ] The redaction helper strips emails and message text (tests).
- [ ] Retention deletes only unsaved sessions older than 30 days (test with fixtures).
- [ ] `docker build` succeeds; the container starts and `/api/health` returns ok against compose Postgres.
- [ ] `/privacy` is readable at 360px and linked from the footer.
