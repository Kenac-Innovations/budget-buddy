<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Budget Buddy: rules for every agent

Budget Buddy is an AI tech advisor that helps a CTO, CIO or CSO turn 2027 business objectives into an ICT plan and a defensible budget. Kenac Computer Systems runs it. Read these before writing code:

1. `docs/user-journey.md`: the journey this build delivers. It is the product spec.
2. `docs/build-plan.md`: the quality bar, workstreams and who owns which files.
3. Your brief in `docs/codex/`.

## Commands

```bash
docker compose up -d        # Postgres on localhost:5434
cp env.example .env         # then add OPENAI_API_KEY
pnpm install
pnpm db:migrate             # prisma migrate dev
pnpm test                   # vitest; must pass
pnpm typecheck && pnpm lint # must pass
pnpm dev
```

## Non-negotiable rules

- **Contracts are shared and frozen:** `src/lib/plan/types.ts`, `src/lib/plan/ops.ts`, `src/lib/advisor/events.ts`, `src/lib/session/store.ts`. Use them; don't change them in a task branch. If you must change one, make it a separate commit titled `CONTRACT CHANGE: …` with tests, and say so in the PR.
- **The plan changes only through `applyOp`.** Never mutate plan JSON directly, in the client or on the server.
- **Never invent prices.** A price needs evidence (`src/lib/sourcing/evidence.ts`). AI-proposed lines start unpriced. Unpriced is never zero.
- **Money is decimal.** Use `decimal.js` and the engine in `src/lib/budget/calculate.ts`. No floats for money.
- **Kenac is always disclosed.** Kenac offers carry the "Kenac" label. Advice about *what to do* never names vendors.
- **Private by default.** Nothing reaches Kenac unless the user shared that line. Contact details are collected only at wrap-up, with separate consents.
- **No personal data in logs.** Log ids and event types, never message text, emails or names.
- **Validate every boundary with zod:** request bodies, tool inputs, model output.
- **UI uses the Humaflow design system** (`docs/design-system.md`, `src/components/ui/*`, tokens in `src/app/globals.css`). No hard-coded colours, no emoji, sentence case, buttons that start with a verb. Must work at 360px and in dark mode.
- **Copy follows the voice in `docs/user-journey.md`:** calm, brief, plain. No exclamation marks.
- **Stay inside the files your brief owns.** Shared files (`package.json`, `prisma/schema.prisma`, `src/app/layout.tsx`) take additive changes only; mention them in the PR.
- **New dependencies:** only those your brief allows.
- **Tests:** every new module under `src/lib` gets vitest tests. UI work gets a short manual test script in the PR.
- **Branch:** `codex/<task-id>-<slug>`. One PR per brief. The PR description lists acceptance criteria with ✅ or ❌.
