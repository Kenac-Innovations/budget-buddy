# Budget Buddy Beta: Build Plan

13 October 2026. Goal: in **about 4 days**, put a beta in front of 3 friendly CTOs that delivers `docs/user-journey.md`: from opening the link to an exported Excel budget, through a conversation with an AI advisor.

The work is split into briefs for Codex agents (`docs/codex/T*.md`) that run in parallel against shared contracts that are already written and tested.

---

## 1. The bar: "smashing and wow", and acceptable to a CIO, CTO and CSO

### Wow: what they should feel in the first five minutes

| # | Moment | How we deliver it |
|---|---|---|
| W1 | **It's already talking.** The advisor's greeting is on screen the instant the page loads. | The opening message is static (`OPENING_MESSAGE`), with no model call or spinner. |
| W2 | **It builds while it talks.** Objectives and initiatives slide into the plan *during* the reply, not after it. | Plan `op` events stream mid-turn; the plan panel animates each one in (T2). |
| W3 | **It catches things.** "Your firewall renews in August. I've added it." | Proactive initiatives and lines carry a "Spotted" marker with a subtle highlight (T1 prompt + T2 UI). |
| W4 | **It has opinions.** It says what's hype and why, then follows the CTO's call. | Persona prompt + trend brief (T1); evals check it (T7). |
| W5 | **The numbers move.** "US$68,285 so far · 4 unpriced" ticks up as lines are accepted and priced. | `planTotals()` into an animated total (T2). |
| W6 | **The handover is beautiful.** The Excel file looks like a consultant made it: cover sheet, objectives, lines by objective, evidence, open questions. | T5 |
| W7 | **It feels like Jarvis.** Calm, brief, anticipatory, dry wit used sparingly. The interface is quiet: a HUD, not a dashboard. | Persona (T1), motion and dark-mode polish (T2) |

### Acceptance, by who's judging

| Who | What they need to see | Where it's handled |
|---|---|---|
| **CIO** | Spend tied to business objectives, and a story Finance and the board will accept | Objective → initiative → line structure; Excel grouped by objective (T5) |
| **CTO** | Technically credible advice: no fluff, no invented facts, honest about hype and prerequisites | Prompt rules + trend brief + evals for invented facts (T1, T7) |
| **CSO** | The tool is safe to use: private by default, nothing sensitive asked early, vague security lines allowed, clear data handling, a hardened platform | Data-handling page, CSP and headers, rate limits, PII-free logs, retention, consent records (T6); prompt rules (T1); CSO evals (T7) |
| **All** | Kenac is disclosed; advice isn't a sales pitch | Opening message, footer, "Kenac" labels, vendor-neutral advice rule, eval checks |

### Release gate (all must hold)

1. The demo script (section 6) runs end to end on a phone and on a laptop, in light and dark mode.
2. Evals (T7) pass:
   - **zero** invented prices;
   - **zero** vendor names at the advice stage;
   - Kenac disclosed in turn 1;
   - ≤ 1 question per turn in ≥ 90% of turns;
   - average judged score ≥ 4/5 for each persona (CIO, CTO, CSO).
3. `pnpm test`, `pnpm typecheck` and `pnpm lint` are clean. The CSO checklist (T6) is signed off.
4. The data-handling page is live and accurate about OpenAI.

---

## 2. Architecture

```
Browser (T2)                                   Server
┌───────────────────────────┐   POST /api/advisor/turn   ┌───────────────────────────────┐
│ Conversation │ Living plan│ ─────────────────────────► │ Advisor turn (T1)             │
│  (stream)    │ (applyOp)  │ ◄──── NDJSON events ────── │  OpenAI model + tools = PlanOps│
└──────┬────────────────────┘   status/text/op/done      │  trend brief in system prompt │
       │ user ops (accept, dismiss, price, share)        │  SessionStore (T3, Postgres)  │
       └─► POST /api/plan/op (T3)                        └───────────────────────────────┘
Wrap-up: POST /api/session/save (T3) → email with return link
Export:  GET /api/export/xlsx (T5) · Share: per-line consent → Kenac view /kenac (T5)
Pricing: Kenac price list → find_kenac_price tool (T4)
```

### Contracts (done, tested; don't change without a `CONTRACT CHANGE` commit)

| File | What it defines |
|---|---|
| `src/lib/plan/types.ts` | The plan: profile, objectives, initiatives, lines, sources, prices |
| `src/lib/plan/ops.ts` | `PlanOp` + `applyOp()`: ids, who can do what (the advisor can't accept or share), the price-evidence policy |
| `src/lib/plan/totals.ts` | Plan → calculation engine totals (accepted lines only) |
| `src/lib/advisor/events.ts` | The NDJSON stream protocol, `readEvents()`, `OPENING_MESSAGE` |
| `src/lib/advisor/fixtures.ts` | Scripted turns for UI work and demo mode |
| `src/lib/session/store.ts` | `SessionStore` interface, in-memory implementation, cookie name |
| `src/lib/sourcing/*` | Evidence policy and Kenac-first matching (fit gate) |
| `src/lib/budget/calculate.ts` | Deterministic money engine |

---

## 3. Workstreams

| Brief | Workstream | Owns | Depends on | Wave |
|---|---|---|---|---|
| **T1** | Advisor brain: OpenAI agent loop, persona, trend brief, tools, `/api/advisor/turn` | `src/lib/advisor/**` (except contracts), `src/app/api/advisor/**` | Contracts | 1 |
| **T2** | Conversation + living plan UI: the wow | `src/app/page.tsx`, `src/app/(advisor)/**`, `src/components/advisor/**` | Contracts (fixtures until T1 lands) | 1 |
| **T3** | Sessions, user plan ops, save at wrap-up, email, return link | `src/lib/session/prisma-store.ts`, `src/app/api/plan/**`, `src/app/api/session/**`, `src/app/r/**`, `prisma/**`, `src/lib/email/**` | Contracts | 1 |
| **T6** | Trust, security and deployment (CSO acceptance) | `next.config.ts`, `src/proxy.ts`, `src/app/privacy/**`, `src/lib/security/**`, `deploy/**`, `Dockerfile`, `scripts/retention.ts` | Contracts | 1 |
| **T7** | Evals: CIO, CTO and CSO personas, hard checks, judge | `evals/**` | T1's route (develop against demo mode) | 1 |
| **T4** | Pricing: Kenac price list import + `find_kenac_price` tool | `src/lib/pricing/**`, `src/lib/advisor/tools/kenac.ts`, `scripts/import-price-list.ts` | T1 tool registry | 2 |
| **T5** | Excel export, sharing with Kenac, Kenac view | `src/lib/export/**`, `src/app/api/export/**`, `src/app/api/share/**`, `src/app/kenac/**` | T3 | 2 |
| **T8** | Integration, wow pass, demo script, release | Anything, with care | All | 3 |

### Waves

| When | Wave | Work |
|---|---|---|
| Day 0 (done) | 0 | Contracts, tests, `AGENTS.md`, this plan, briefs |
| Days 1–2 | 1 | T1, T2, T3, T6, T7 in parallel (five Codex agents) |
| Days 2–3 | 2 | T4, T5 (start once T1's tool registry and T3's store are merged) |
| Days 3–4 | 3 | T8 integration; eval run; fixes; send to 3 CTOs |

Merge order: **T3 → T1 → T2 → T6 → T7 → T4 → T5 → T8**, rebasing on `main` before each merge.

---

## 4. How to run the Codex agents

1. Push this repo to GitHub (Codex cloud works from a repo), or open it in the Codex app locally.
2. For each Wave 1 brief, start a Codex task with:
   > Read AGENTS.md, docs/user-journey.md, docs/build-plan.md and docs/codex/T1-advisor-brain.md. Implement T1 exactly as briefed on branch codex/T1-advisor-brain. Open a PR when the acceptance criteria pass.
3. Review each PR against its acceptance list. Merge in the order above.
4. Start Wave 2 once T1 and T3 are merged.

---

## 5. Inputs needed from Kenac (non-blocking for Wave 1)

| Input | Needed by | If missing |
|---|---|---|
| OpenAI key + the confirmed GPT-6.1 model id | T1 (live mode) | Demo mode works without it |
| Kenac price list (CSV or Excel export) | T4 | Lines priced by quote or estimate only |
| One engineer for 1 hour reviewing the trend brief | Before the CTO sends | Ship marked "draft"; review in week 1 |
| SMTP credentials for the "send my plan" email | T3 | Show the return link on screen + download only |
| Kenac data centre deploy target (namespace, domain, TLS) | T6 | Deploy to a temporary host for the pilot |
| The advisor's name | T8 | "Budget Buddy" |

---

## 6. Demo script (the release test)

1. Open the link on a phone. The greeting appears instantly, discloses Kenac and states privacy.
2. Type: "We're about 180 staff, head office and four new branches next year. The board wants fewer outages." → The profile and two objectives animate in while it replies. One question back.
3. Answer: "Mostly power; ZESA cuts." → Solar/UPS is recommended (Fund) and SD-WAN marked Investigate with a caution. A spotted firewall renewal appears. Sources show dates.
4. Accept two initiatives, set one aside with a reason. Ask "what will the solar cost?" → It doesn't guess: a Kenac price-list item if one fits (labelled), otherwise "Unpriced", and it explains how to get a quote.
5. Enter your own estimate for one line → labelled "Own estimate"; the total ticks up and says "so far".
6. Say "let's wrap up" → A summary card appears; enter details; ☑ email ☐ contact → Excel downloads and the email arrives with a return link.
7. Share one line with Kenac and preview what they see (amount hidden) → It appears in `/kenac` without the allocation.
8. Open the return link on a laptop → "Welcome back…", and the plan is intact. Switch to dark mode.
