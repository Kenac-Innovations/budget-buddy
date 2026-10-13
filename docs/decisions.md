# Budget Buddy: Product Decisions

Decided 13 October 2026. These answer the open questions in `spec-review.md` and override the spec where they conflict.

## D1. The operator is Kenac Computer Systems

Kenac runs the platform, hosts it, receives shared demand, and is also a supplier.

**Consequences**
- Budget Buddy is **branded as a Kenac product** ("Budget Buddy by Kenac"). It doesn't present itself as a neutral advisor. Saying so openly is what makes Kenac-first recommendations acceptable.
- Kenac staff can technically read data in a Kenac-hosted database. The terms of service must state what Kenac staff can and cannot access, and access must be enforced and audited in code (role `OPERATOR_STAFF` sees only shared lines).
- A shared **allocation** shows a supplier the buyer's budget. Sharing allocations is a separate field-level choice, off by default. Quantity, spec and timing can be shared without it.

## D2. Recommendations match Kenac products first

Order of precedence (implemented in `src/lib/sourcing/match.ts`):

1. **Fit comes first.** An offer that fails a stated requirement is excluded, Kenac's included. A confirmed fit outranks one with unverified attributes.
2. **Kenac comes first among offers with the same fit level.**
3. Then priced before unpriced, cheapest first.

External options are searched only when Kenac has no confirmed-fit offer, **except**:
- when the organisation is a **public entity** (`isPublicEntity`), because competitive quotations are required under public procurement rules (*confirm PRAZ thresholds*);
- when the user asks for alternatives. This stays available to every user.

Every Kenac offer is labelled "Supplied by Kenac Computer Systems, which operates Budget Buddy".

*Why the fit gate:* if a Kenac product that doesn't meet the spec is ranked first, the customer finds out at delivery, and the whole product loses their trust.

## D3. Pilot targets this budget season (Q4 2026)

That means a working pilot within about four weeks. The scope is cut to the minimum below.

## D4. Prices must be backed by a source

Implemented in `src/lib/sourcing/evidence.ts`.

- Accepted sources: Kenac price list, a published supplier price, a quote, a contract, the organisation's historical actuals.
- **AI never produces a price.** It can attach an existing source, otherwise the line stays unpriced.
- A person may enter their own estimate (`USER_ESTIMATE`). It is attributed to them and labelled. *(This is my interpretation of "only with prices backed by a source". The person entering the figure is the source. Change this if you want only documented sources.)*
- Expired quotes are rejected. Price lists or published prices older than 90 days are flagged as stale.
- AI suggestion → unpriced line → Kenac price list match or "request a quote".

## D5. Hosted in the Kenac data centre

- The app and Postgres run on Kenac infrastructure, deployed the same way as other Kenac services (k8s + ArgoCD).
- **Still open:** the AI calls. Using the Claude API means prompts leave the data centre. The rule is to send only the minimum, with no organisation names, people, or salary lines, and to record the decision under the Cyber and Data Protection Act. The alternative is a self-hosted model, which is weaker at this task.

## MVP for this season

| Week | Deliverable |
|---|---|
| 1 | Auth + org/membership; budget setup (period, currencies, ceiling); line editor wired to the engine; Kenac catalogue import (CSV/Excel price list) |
| 2 | Excel/CSV budget import with column mapping and review; evidence attachments; exchange-rate table |
| 3 | AI completeness review (omissions, renewals, components) + Kenac matching on suggested lines; Excel export from saved versions |
| 4 | Reduced-budget scenario; PDF summary pack; per-line sharing consent (Private / Identified, allocation opt-in); operator CSV export of consented lines; pilot with 2–3 customers |

**Out:** operator console, calendar, anonymous aggregates, web supplier research, RFQ workflow, real-time co-editing, reminders.

## Inputs needed from Kenac

1. **The product catalogue/price list:** where it lives (ERP, Sage, spreadsheet), its format, and how often it changes. Matching relies on normalised attributes (RAM, CPU class, warranty years, licence tier), so the catalogue needs them or they have to be derived.
2. **Pilot customers:** 2–3 organisations doing their 2027 budget now, ideally one public entity.
3. **Auth:** use an existing Kenac identity provider, or email/password for the pilot.
4. **AI provider decision** (D5).
