# Budget Buddy: Critical Review of the Product Specification

Reviewed: 13 October 2026, against `docs/product-specification.md`.

The spec is careful. It is honest about uncertainty, it gets the financial-integrity principles right (unpriced ≠ zero, deterministic totals, evidence carries dates), and it takes consent seriously. Its problems are elsewhere. The business model has a conflict at its centre that the spec treats as a UX problem. The "MVP" is really two products. And the most valuable part, the organisation-side budgeting tool, has to beat Excel plus a general chatbot, which costs the customer nothing. The spec doesn't explain how it wins that comparison.

Findings are ordered by how much they could hurt the product.

---

## 1. The operator is undefined, and every trust promise depends on it

Open decision #3 ("whether the operator is also a sourcing business") is listed last-but-ten. It should come first, because the answer changes most of the spec.

- **If the operator sells or brokers ICT goods,** Budget Buddy is a lead-generation funnel that sits upstream of the buyer's procurement process. A shared "allocation" tells a seller the buyer's maximum price before any quote is requested. That anchors pricing against the customer, which is the opposite of what an ICT manager wants.
- **Public entities and parastatals** run procurement under Zimbabwe's public procurement law, regulated by PRAZ. Sharing budget allocations and specifications with a party that could later bid, or that brokers bidders, before a tender may compromise the competitive process. *Get legal advice before the pilot.* This could exclude a large part of the addressable market from the demand side altogether.
- **"Private" only means private from the UI.** If the operator and the platform host are the same company, the operator's staff can technically read every private budget in the database. §24 ("operator cannot read private budgets") is a policy promise unless there is organisational separation or encryption the operator can't bypass. The terms of service have to say this honestly, or the trust model fails the first time a customer asks.

**Decision needed:** who is the operator, what do they earn, and are they ever on the sell side of a transaction?

## 2. Sharing gives the organisation nothing in the MVP

§17 builds detailed consent machinery: four sharing modes, field-level previews, permission records, revocation. But it never answers the customer's question: *why would I share?* Bulk procurement, supplier introductions and pooled pricing are all out of scope (§23, §27). In the MVP, the organisation takes on disclosure risk and gets nothing back. Expect opt-in close to zero, which leaves the operator side of the product with no data.

**Suggested give-back:** price benchmarks. Organisations that share quote evidence get anonymised "what others paid" ranges for comparable specifications. The demand flow then also strengthens the organisation's negotiating position, which is the opposite of the anchoring problem in §1. Benchmarks also fix the weakest part of the research engine (§4 below).

## 3. Anonymous aggregation won't work at Zimbabwean pilot scale

§22 requires minimum-disclosure thresholds and suppression. That's correct, but with 5–20 pilot organisations, almost every useful group (sector × category × quarter) falls below any sensible threshold. Even with suppression, "a bank in Harare buying 120 laptops in Q2" identifies one organisation in a small market. And as noted in §1, anonymity *against the operator* isn't technical when the operator runs the database.

**Recommendation:** drop "Anonymous demand" from the MVP. Offer **Private** and **Identified** only. Add anonymous aggregates when participation can support them.

## 4. The research and supplier engine will mostly return "Requires confirmation"

The spec rightly forbids made-up prices, suppliers, and certifications. In Zimbabwe, though, most ICT resellers don't publish prices, stock or partner status online. Honest research will therefore produce shortlists full of "Requires confirmation" and price fields that are mostly unknown. That's correct behaviour, and it's also a weak demo.

There's a related contradiction. §9 says the draft generator should "label uncertain prices as estimates", while §13 forbids made-up prices. **An LLM's price guess is a made-up price, whatever label it carries.** Pick one policy:

- AI-suggested lines start **unpriced** (recommended), or
- AI estimates must cite a source (published price, the organisation's own historical actuals, or consented benchmark data) and show a range.

Where the real value is: omission detection (renewals, implementation, training, backup power, recovery testing), dependency checks, and drafting justifications. These need the organisation's own data, not the web. Lead with them.

## 5. The MVP is two products

The acceptance table in §27 has 15 rows. It covers spreadsheet import, a multi-currency calculation engine, versioning with undo, AI research, supplier discovery, scenarios, an approval-pack generator, field-level sharing, an operator schedule, a calendar, privacy-preserving aggregation, a confirmation workflow, and cross-tenant access tests. §28 phases the work sensibly (demand intelligence in Phase 4), but §27 then puts all of it in MVP acceptance. The two sections contradict each other.

**Proposed MVP (one ICT manager, one budget):**

| In | Out (for now) |
|---|---|
| Setup + custom period + currencies | Operator console, calendar, aggregation |
| Excel/CSV import with mapping review | Anonymous sharing |
| Structured lines + deterministic engine | Supplier discovery web research |
| Exchange-rate assumptions per period | Concurrent multi-user editing |
| AI completeness review + justification drafting | Recommendation engine with web research |
| Two scenarios (working + reduced) | RFQ workflow beyond a template |
| Excel export (+ PDF if pilot needs it) | Freshness/confirmation reminders |
| Sharing **consent capture** per line (Private/Identified) | |

On the operator side, run it as a concierge: the operator gets a CSV of consented requirements and works it by hand during the pilot. Build the console only once the operator has shown they can turn that list into revenue.

## 6. Seasonality decides the timeline

Organisations on a January–December financial year build their budgets in roughly Q3–Q4. This spec is dated mid-October. A pilot for the 2027 cycle has a window of weeks. Miss it, and the next real test of the full journey comes around Q3 2027. Phase 1 interviews and a prototype need to happen **now**, or the plan should openly target mid-year reforecasts or organisations with non-calendar financial years (e.g. April or July).

The commercial model has the same problem. A tool used intensively once a year makes a hard subscription case (§30). Options: price per planning cycle, or make the budget live all year (actuals vs plan, renewal alerts). Note that actual-spend sync is currently out of scope.

## 7. Currency handling is too thin for ZiG

§12 stores one rate per currency pair per budget version. In a 12-month budget with a currency that can move a lot, one rate isn't realistic. Needed:

- **Rates that vary over time inside a version** (rate effective from month X). *The scaffolded engine already does this.*
- **Three currencies per line, kept separate:** price currency (what the quote says), payment currency (what the supplier will accept), reporting currency.
- **Payment-channel costs:** foreign-card subscription limits, transfer taxes on electronic payments (e.g. IMTT; *confirm the current rate*), FX sourcing constraints for USD-only suppliers. These are real budget lines that ICT managers forget, and a good fit for the "identify omissions" feature.
- **Which rate:** the official/interbank rate or a planning rate. Always the user's choice, never the product's.

## 8. Ambiguities that will block engineering

| # | Ambiguity | Proposed resolution |
|---|---|---|
| a | **Version model.** "Working budget", "budget version", "active planning version", "scenario", "approved snapshot". Which one does a demand record follow while a draft edit is unsaved? While an approved budget is under revision? | One mutable *working draft* per budget. *Versions* are immutable snapshots (on submit, approve, export). Shared demand follows the latest **saved version marked active**, never the live draft. |
| b | Default column "**annual** reporting total" vs custom-length periods (§7) | Call it "period total"; show an annualised figure only when the period isn't 12 months. |
| c | Cash timing vs coverage (§11) | MVP is **cash basis only**. Coverage dates are stored for information, not calculated. *(Engine does this.)* |
| d | Prorating "requires explicit policy" | MVP: whole months, no prorating. *(Engine does this.)* |
| e | Line "additional components" (delivery, implementation) vs one-requirement-to-one-line demand linkage | Model components as **child lines** with their own evidence. The demand record shares the parent quantity/spec and, optionally, the combined allocation. |
| f | Scenario lines reuse stable line IDs: which quantity goes to the demand record? | Scenarios never feed demand (spec already says this). Applying a scenario creates a new working-draft state, and demand follows the next active version. |
| g | Tax "no silent default" | Line-level `tax_treatment: included / excluded(rate) / unresolved`. Unresolved counts as an incomplete total, the same way unpriced does. |
| h | Excel export: live formulas or values? | Finance reviewers will edit it. Export values plus a formula-driven summary sheet, and stamp version ID + rate table. |
| i | Concurrent editing + undo + autosave | MVP: single-editor lock per budget, with a version history. Real-time co-editing is a large cost for a rare case. |
| j | Status overload: budget status, procurement status, readiness, freshness, evidence type, sharing mode | Show only budget status and evidence type in the budget grid. The rest go on the demand screen. |

## 9. Compliance and hosting

- **Data protection:** Zimbabwe's Cyber and Data Protection Act regulates cross-border transfers of personal data, with POTRAZ as the authority (*confirm the current obligations*). Budgets contain staff names, contacts and sometimes salary lines. Sending them to an overseas LLM API is a cross-border transfer. Decide on hosting and LLM data-handling terms before pilot recruitment, because enterprise ICT leaders will ask.
- **Prompt injection:** §25 correctly treats uploaded documents and web pages as evidence. Enforce it in the architecture: research outputs can only *propose* changes through the same preview-and-accept path, never call write tools directly.

## 10. What is missing from the spec

- **The competitor is Excel + ChatGPT/Claude.** Name the thing that wins against them. A strong candidate: *the AI that remembers your estate and last year's commitments, and catches what you forgot, plus a board-ready pack whose numbers can't drift from the spreadsheet.*
- **Who pays.** The ICT manager uses it, but the money probably comes from Finance or the CEO, or from the operator. Validate this in Phase 1 interviews, not after the build.
- **A north-star metric.** Suggest *budgets exported as approval packs per cycle*, with *% of spend backed by quote-or-better evidence* as the quality measure.
- **Seed content.** Category templates for omission checks (e.g. "laptop refresh → bags, docking, imaging, disposal, warranty extension"). This is the actual product IP, and the spec doesn't mention it.

---

## Decisions to make before building past the engine

1. Who the operator is, and whether they are ever on the sell side. (Blocks §1, §2, §3.)
2. Pilot timing: the current Q4 budget season or the 2027 mid-year cycle. (Blocks §6.)
3. MVP cut: accept §5's cut, or keep the operator console in scope.
4. AI price policy: unpriced-by-default or sourced-ranges-only. (§4)
5. Hosting and LLM data residency stance. (§9)
