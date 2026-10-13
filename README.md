# Budget Buddy

AI-assisted ICT budgeting workspace for Zimbabwean ICT leaders. Plan your ICT budget. Know your options. Defend your decisions.

- Product spec: [docs/product-specification.md](docs/product-specification.md)
- Critical review and open decisions: [docs/spec-review.md](docs/spec-review.md)

## Status

Pre-MVP. The only implemented domain code is the deterministic calculation engine
([src/lib/budget/calculate.ts](src/lib/budget/calculate.ts)), because every other feature depends on it and its behaviour doesn't depend on the open product decisions.

Engine rules: decimal arithmetic, cash basis, whole months with no prorating, per-unit vs bundle pricing,
exchange rates that can change month by month, and unpriced/unconverted lines flagged rather than counted as zero.

## Develop

```bash
pnpm install
pnpm test        # calculation engine tests
pnpm typecheck
pnpm dev
```

Stack: Next.js 16, React 19, TypeScript, Tailwind 4, decimal.js, Vitest. Persistence (Prisma/Postgres), auth and the AI layer
will be added after the decisions in `docs/spec-review.md` are made.
