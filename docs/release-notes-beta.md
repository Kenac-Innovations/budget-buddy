# Budget Buddy beta · 14 October 2026

The integrated beta is ready for local demonstration. It is **not released for a live customer pilot**: the external and security gates below remain open. Work is committed locally on `codex/T8-integration`; there is no remote and nothing was pushed or deployed.

## What is in

- Immediate Kenac-disclosed greeting, streamed conversation and a living objectives → initiatives → budget plan. Demo proposals arrive during the reply; the firewall renewal is marked Spotted.
- Accept, set aside with a remembered reason, and own estimates through `applyOp`. Decimal totals include accepted lines; unpriced items remain unpriced. Empty wrap-up says “No priced lines yet”.
- One shared session store across advisor, decisions, save, Excel, return links and sharing. A configured, reachable migrated database uses Prisma; an initial unavailable database falls back to memory in demo mode. The chosen store stays pinned. Live mode with a configured but unavailable database fails visibly instead of silently losing saved data.
- Contact details only at wrap-up, separate email/contact consents, private return links and five-sheet Excel download. Without SMTP, saving shows the private return link and download; it does not claim delivery.
- Optional per-line sharing with an exact preview. Allocations and contact details are hidden by default. Protected Kenac HTML/CSV views honor withdrawal. The default live agent registers the Kenac lookup, preserves its fit gate and disclosure, and binds usable pricing evidence to the looked-up line and scope.
- Permanent privacy link, production security headers, rate/body/origin controls, redacted outcome logs, session deletion and token invalidation. Browser drafts are removed after successful deletion; theme preference is preserved.
- `pnpm eval --help`, `pnpm test:evals` and `pnpm test:all`.

## Run the local demo

Use the existing dependencies; no new dependency is required:

```sh
pnpm install
ADVISOR_MODE=demo DATABASE_URL= SMTP_HOST= APP_URL=http://localhost:3208 pnpm dev --port 3208
```

Open `http://localhost:3208`. No OpenAI key or Postgres is needed. For the protected local sales-view demonstration, set `KENAC_VIEW_TOKEN` to a freshly generated secret of 32–512 base64url characters before starting. Use the `/kenac` login; never put the secret in a URL. The synthetic token in the committed browser review script is local test data and must never be used for deployment.

Follow [build-plan section 6](build-plan.md#6-demo-script-the-release-test). Accept both objectives, solar and firewall initiatives; set SD-WAN aside with a reason. Accept the three budget lines. Ask about solar cost, then enter a unit own estimate of USD 3,500: four branches give US$14,000 so far and two unpriced lines. Ask to wrap up, save synthetic details with contact consent unchecked, download Excel, preview/share just the solar line without its allocation, and reopen the private return link in another browser. Withdraw the share and verify privacy deletion. Stop the server with Ctrl-C.

Demo mode is a scripted bank/power example, with fictional role/sector, measures, timing and renewal assumptions visibly identified as demo. It does not adapt to arbitrary organisations and never loads the synthetic price-list fixture. Memory drafts, saved links and shares last only for that server process; use Postgres for durable customer plans. Live server-side context is disclosed on `/privacy`; the earlier journey’s device-only wording is not a runtime promise.

The local production build was tested on port 3208 at 1440 × 960 and 360 × 800 in light/dark mode. All four journeys passed, with one anonymous resume GET (204), no console/CSP errors and no document overflow. [T8 evidence and recordings](codex/reports/T8.md) includes saving, XLSX, sharing, cross-context return, withdrawal and deletion. Real email delivery was not part of that keyless path.

## Verification

- `pnpm test`: 223 app tests pass; `pnpm test:evals`: 62 eval tests pass. `pnpm test:all` runs both.
- `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
- Full integrated HTTP demo eval: 12 scenarios, zero hard findings, zero invented prices, zero unsolicited advice brands, first-turn disclosure in 12/12 and one-question check 100%. The [committed diagnostic report](../evals/reports/2026-10-14T03-42-48.577Z.md) intentionally fails release: scripted users have no live judge or persona scores. No live eval was run.
- Demo health: HTTP 200, `{ok:true,db:"down",model:"missing"}`. Anonymous export and Kenac views return 401. This is demo liveness, not live readiness.
- Downloaded workbook parsed with five sheets, cached spend 14,000 and unpriced count 2; formula/evidence/privacy golden tests pass. T5’s LibreOffice rendering/recalculation evidence remains available. Native Excel and real SMTP attachment review are pending.

## Release blockers and known gaps

| Input or gate | Required before live pilot |
| --- | --- |
| OpenAI key + model id | Configure the project key and account-confirmed `OPENAI_MODEL`; confirm GPT-6.1 availability. Run all 12 live scenarios with an independent judge, each persona ≥4/5, the exact build-plan hard thresholds and <15-minute runtime. Configure account billing rates and reconcile advisor usage against billing; the frozen stream supplies no usage event. |
| Postgres | Provide a working database, apply existing migrations, test real row locks/version conflicts, save/export/share/delete/return across restart, price-list import and retention including concurrent saves. Verify TLS, least privilege, backup expiry and deletion after restore. Memory cannot support durable or replicated release. |
| Kenac price list | Obtain a genuine dated CSV/reference and import it. Verify idempotence, removal/reactivation, expired/impossible fits, labels and public-entity competing quotes against real persistence. Never import the synthetic sample into the pilot. |
| SMTP | Configure `SMTP_HOST`, port, credentials and `MAIL_FROM`; set the real `APP_URL`. Verify delivery, attachment and private return link using a controlled mailbox. No real email was sent here. |
| Deploy target | Approve host/namespace/domain/TLS/ingress and secrets, validate the container against Postgres, health/readiness, image/dependency scan and retention job. No public beta URL or phone-over-mobile-data check exists. Keep one pilot replica until shared rate limits and distributed turn coordination are resolved. |
| Brief review | A Kenac engineer must review the DRAFT trend brief, dated claims and technical prerequisites. Demo assumptions are not validated customer facts. |
| Advisor name | Currently “Budget Buddy”. Confirm the public name and greeting before sending invitations. |
| External context minimization (D5) | Current live requests send full session history and current plan with `store:false`; saved contact metadata is not inserted. Names/PII or salary details typed in chat are not automatically removed. Implement and test a reviewed minimal field/history policy before live use, including reasoning/tool continuation. Account retention/cache settings and transfer safeguards also need review. |
| CSO/legal approval | Confirm consent basis, international transfers, actual hosting, monitored privacy mailbox, privileged access/audit, backup deletion and incident response. The complete [CSO inventory](security.md#t8-integrated-checklist-14-october-2026) states gaps; it is not signed off. Staff SSO/RBAC is not supplied by the shared Kenac bearer-secret view. |
| Native Excel | Open the integrated export in native Excel and confirm edits/recalculation. Programmatic and inherited LibreOffice checks do not claim native Excel acceptance. |
| Credential lifecycle | Private links are bearer credentials, valid until deletion; cookies last 30 days. Approve saved-link expiry/rotation policy. No accounts/team editing are included. |
| Scaling and fallback | Memory sharing/index/session state and rate limits are process-local. Initial demo DB fallback is pinned until restart; later DB failures are surfaced. Evaluate concurrency, ingress IP trust and centralized limits before broader access. Repeated reviews can hit the intentional 10-save/return-links-per-10-minutes limit. |

Voice, a face, PDF packs, automated supplier search/outreach and team accounts remain outside beta scope.

## Give feedback

For the three friendly reviewers, record whether the objective-to-spend story is defensible, the technical recommendation is credible and the privacy choices are clear. Include the step, viewport/theme and expected behavior. Keep real plan/contact details out of issue text. Route feedback through the agreed Kenac pilot owner once that owner and the deployment are confirmed.
