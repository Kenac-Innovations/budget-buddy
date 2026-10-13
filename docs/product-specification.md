# Budget Buddy — Product Specification

**Document type:** Product vision, requirements, and experience specification  
**Prepared from:** Founder discovery discussion  
**Initial market:** Zimbabwe  
**Date:** 13 October 2026  
**Status:** Proposed product specification for design and implementation planning  
**Working positioning:** Plan your ICT budget. Know your options. Defend your decisions.

> This document specifies the proposed product. Examples are illustrative, and product choices marked as proposed require validation. It does not assert current supplier availability, prices, exchange rates, tax rules, or market demand. Those facts require dated research or customer evidence during operation.

## 1. Product vision

Budget Buddy is an AI-assisted workspace that helps ICT leaders build credible departmental budgets, research relevant technology investments, compare supplier options, and prepare management approval materials.

With participating organisations' permission, it also turns selected purchasing requirements into an organised demand schedule for the platform operator. That schedule shows what organisations need, quantities, expected spending, intended purchase periods, and procurement readiness.

The product serves two connected purposes:

1. Help an organisation make better budgeting and purchasing decisions.
2. Help the operator understand and coordinate consented ICT demand across organisations.

The organisation-facing experience must provide standalone value. Sharing purchasing demand is a transparent choice, not an undisclosed consequence of creating a budget.

## 2. Product objectives

- Reduce the effort required to prepare an annual ICT budget.
- Improve completeness by identifying omitted costs, renewals, dependencies, and assumptions.
- Connect spending to business priorities and explain the consequences of deferral.
- Supply current, sourced technology and supplier research relevant to Zimbabwe.
- Distinguish estimates from quotations, contracts, and actual spending.
- Produce a spreadsheet and management justification from one consistent budget version.
- Give the operator a searchable, permission-aware purchasing schedule.
- Keep demand records current as budgets and procurement intentions change.

### Definition of a successful first release

An ICT leader can import or create a budget, refine its costs and assumptions, research investments and suppliers, compare funding scenarios, and export a defensible approval pack. If the organisation opts in, selected requirements appear accurately in the operator's demand schedule with purchase timing and readiness.

## 3. Target users and their jobs

| Persona | Main job | Key outcome |
|---|---|---|
| CTO, CIO, or ICT manager | Prepare and defend the department's annual budget | A complete, explainable budget aligned to business priorities |
| Security leader | Plan security spending within the ICT budget or a dedicated security budget | Investments justified by organisational needs and dependencies |
| Budget contributor | Supply quantities, costs, quotations, and project requirements | Accurate inputs without rebuilding the whole budget |
| Finance or executive reviewer | Examine assumptions and approve spending | Clear totals, evidence, tradeoffs, and unresolved questions |
| Organisation administrator | Manage workspace membership and sharing | Controlled access and clear ownership |
| Platform operator | Understand participating organisations' future ICT demand | An organised schedule with reliable status and follow-up information |

The MVP primarily serves CTOs, CIOs, and ICT managers building their own departmental budgets. Security-specific workflows can use the same structure. Whole-organisation budget consolidation is a later expansion.

## 4. Customer problems

### Organisation problems

- Previous budgets and actual spending are scattered across spreadsheets and documents.
- Recurring commitments and renewals are easily overlooked.
- Technology recommendations lack context or a clear financial impact.
- Supplier comparisons omit implementation, support, and renewal costs.
- Budget reductions are made without explaining operational consequences.
- Management narratives drift from the spreadsheet's figures.
- Currency, timing, and price assumptions are difficult to inspect.

### Operator problems

- Purchasing requirements arrive in inconsistent formats.
- Draft intentions are confused with approved, actionable demand.
- Quantities and specifications cannot be compared reliably.
- Purchase timing becomes stale.
- Supplier follow-up is disconnected from the organisation's original requirement.
- Aggregate demand is difficult to assess without revealing confidential information.

## 5. Product principles

1. **The budget is the source of financial truth.** Chat and reports refer to its structured records.
2. **AI proposes; users accept.** Material changes require a visible preview and confirmation.
3. **Evidence accompanies important claims.** Price and supplier assertions carry sources and dates.
4. **Unknown is a valid state.** Missing figures or facts are never silently invented.
5. **Planning and procurement are distinct.** Budget approval does not imply readiness to buy.
6. **Sharing is intentional.** Organisation data is private unless an authorised user chooses otherwise.
7. **Questions are progressive.** Ask only what is needed for the next useful outcome.
8. **Calculations are deterministic.** Financial totals come from calculation rules, not generated prose.
9. **Research serves a decision.** Trends are assessed against actual organisational needs.
10. **Changes are recoverable.** Autosave, history, and undo protect work.

## 6. Product structure and navigation

### Organisation workspace

- **Overview:** totals, ceiling, priorities, readiness, and outstanding tasks.
- **Budget:** editable line items and monthly allocations.
- **Recommendations:** researched investments and cost-completeness suggestions.
- **Suppliers:** shortlists, evidence, and quotation comparisons.
- **Scenarios:** alternative funding plans.
- **Approval Pack:** management narrative and exports.
- **Demand Sharing:** selected requirements, visibility, and procurement status.
- **Settings:** members, financial assumptions, organisation profile, and permissions.

### Operator workspace

- **Demand Overview:** aggregate demand and upcoming action.
- **Demand Schedule:** searchable requirements table.
- **Purchasing Calendar:** requirements grouped by month or quarter.
- **Organisations:** permitted organisation profiles and shared requirements.
- **Demand Analysis:** grouped quantities, allocations, and readiness.
- **Follow-ups:** internal actions and due dates.
- **Supplier Coordination:** authorised shortlists and RFQ preparation.

### Interaction layout

Desktop uses a left navigation, a main working area, and a collapsible assistant panel. A top bar shows the budget name, planning period, currency, save state, and export action.

The assistant uses the selected row or recommendation as context. Mobile should support review, status updates, and short conversations; complex spreadsheet editing is primarily a desktop experience.

## 7. Organisation onboarding

### Entry choices

- Start from last year's budget.
- Build from scratch.
- Review an existing draft.

### Minimum setup

| Input | Behaviour |
|---|---|
| Organisation and industry | Used to contextualise planning |
| Department | Defines spending scope |
| Financial-year start and end | Supports calendar and custom periods |
| Reporting currency | Establishes consolidated presentation |
| Budget ceiling | Optional; absence does not prevent planning |
| Staff and site counts | Approximate values accepted |
| Business priorities | User identifies the most important outcomes |

Users can select “I don't know yet.” Missing inputs become visible tasks rather than blockers unless necessary for a specific calculation.

### Progressive organisation profile

Collect existing hardware, applications, licence commitments, connectivity, hosting, security controls, support arrangements, staffing, planned growth, approved projects, procurement constraints, and relevant branch requirements.

Questions adapt to context. Device counts do not automatically imply a purchase quantity. The user confirms replacement and growth needs.

### Sharing introduction

Explain the operator's demand-collection purpose before any sharing occurs. Default to private. An authorised organisation administrator selects workspace defaults, and permitted users can make more restrictive choices for individual requirements.

## 8. Import and baseline creation

### MVP input formats

Excel and CSV are structured imports. Quotations, contracts, and other documents can be attached to individual lines. Reliable document extraction is a later feature or a separately reviewed workflow.

### Import sequence

1. Upload file and select worksheet.
2. Preview detected data.
3. Map columns to budget fields.
4. Identify the source type: historical budget, actual spending, current draft, or other.
5. Resolve unclear currencies, combined costs, totals, frequencies, and duplicates.
6. Preview the proposed records and validation findings.
7. Confirm import.

### Rules

- Preserve the original attachment and imported source reference.
- Ignore subtotal rows as expenses after user review.
- Do not treat historical allocations as current quotations.
- Do not silently overwrite existing lines.
- Identify possible duplicates without deleting them automatically.
- Preserve original values when conversion or normalisation occurs.
- Explain unsupported spreadsheet features and unresolved mappings.

## 9. Draft budget generation

The first draft combines existing commitments, user priorities, and separately presented suggestions.

### Default categories

Hardware; software and subscriptions; connectivity; cloud and hosting; cybersecurity; staffing and professional services; support and maintenance; training; strategic projects; and explicit contingency provisions.

Categories are editable. Suggested operating/capital classification is subject to the organisation's finance policy.

### Generation behaviour

- Include confirmed recurring commitments with correct timing.
- Convert user-described projects into proposed line items.
- Surface related implementation, migration, delivery, training, and support costs.
- Label uncertain prices as estimates with assumptions.
- Explain each suggested addition.
- Let users accept, edit, dismiss, or defer suggestions.

A dismissed recommendation records the reason where supplied and informs later suggestions.

## 10. Budget line specification

### Default table columns

Item, category, quantity, unit cost, original currency, annual reporting total, timing, priority, and evidence status.

### Detailed record

| Field | Requirement |
|---|---|
| Stable line identifier | Retained through edits, exports, and demand linkage |
| Description and scope | Clear statement of what is being funded |
| Category | Editable classification |
| Quantity and unit | Devices, seats, sites, months, services, or a custom unit |
| Price basis | Per unit, bundle, tier, or custom schedule |
| Unit or bundle price | Explicit amount with original currency |
| Frequency | One-off, monthly, quarterly, annual, or custom |
| Active dates | Determine costs inside the planning period |
| Payment timing | Separate from service coverage where necessary |
| Additional components | Delivery, implementation, support, training, and related costs |
| Tax assumption | Included, excluded, or unresolved; no silent default |
| Operating/capital classification | User-confirmable |
| Priority | User-defined importance |
| Business objective | Link to organisation priority |
| Dependencies | Related lines or prerequisites |
| Owner | Responsible person |
| Evidence type | Estimate, published price, quote, contract, or historical actual |
| Evidence reference and date | Attachment or source link |
| Estimate range | Optional low, expected, and high values |
| Justification | Need, intended outcome, and consequence of deferral |
| Sharing policy | Controls demand visibility |

## 11. Financial calculation behaviour

- A per-unit expense uses quantity × unit price × applicable occurrences.
- Bundle prices apply once per bundle; component quantities do not multiply the bundle price again.
- Monthly subscriptions use active months within the planning period.
- Annual payments occur in the planned payment month; service coverage remains separately visible.
- Irregular payments use an explicit payment schedule.
- Taxes and additional costs apply according to user-confirmed rules.
- Partial periods and prorating require explicit policies rather than assumptions.
- Use decimal arithmetic and defined currency rounding; avoid floating-point financial drift.
- Preserve original-currency totals before reporting conversion.
- A missing price is unpriced, not zero.
- A missing rate is unconverted, not zero.
- Clearly mark consolidated totals as incomplete when unpriced or unconverted items exist.

### Cash timing and annual cost

The budget distinguishes payment timing from service coverage. MVP exports should identify the basis of monthly totals. Formal accrual accounting is outside MVP scope unless explicitly implemented and reviewed.

### Contingency

Users can choose a fixed provision or a percentage applied to a specified set of lines. Show its basis and avoid applying contingency twice through both line-level allowances and a global provision.

## 12. Currency and Zimbabwe planning context

Support USD and ZiG initially, with additional currencies for foreign purchases. Currency choices and labels should be reviewed as the product launches and maintained over time.

Each exchange assumption records currency pair, direction, rate, effective date, source or user note, and budget version.

Changing a rate previews the financial effect before applying it. Original amounts remain intact. Exports retain the assumptions used for that version.

Local planning questions may cover connectivity, backup power, delivery, local support, foreign subscriptions, payment currencies, and procurement lead times. Ask whether these factors apply.

Current rates, tax treatment, and supplier conditions require dated verification. The tool should not present generated financial assumptions as authoritative rules.

## 13. ICT recommendation engine

### Inputs

Organisation profile, business priorities, existing systems, accepted budget items, funding ceiling, timing, and user constraints.

### Recommendation record

- Proposed action.
- Organisation-specific reason.
- Evidence links, research date, and source type.
- Alternatives, including maintaining the current arrangement.
- Initial and ongoing cost implications.
- Dependencies and implementation effort.
- Intended outcome and how it could be evaluated.
- Suggested disposition: fund, pilot, investigate, or defer.
- Uncertainties and follow-up questions.

### Research workflow

1. Define the decision being researched.
2. Search using the minimum non-confidential context needed.
3. Prefer authoritative product documentation and credible current evidence.
4. Distinguish supplier claims from independently established facts.
5. Summarise fit and alternatives.
6. Present dated evidence and assumptions.
7. Offer an explicit budget-change preview.

Research runs on user request or an explicitly requested budget review. Saved recommendations retain their research snapshot. A refresh creates an updated snapshot rather than silently rewriting historical evidence.

AI must not fabricate prices, suppliers, sources, certifications, or return-on-investment figures. Unsupported benefits remain hypotheses to validate.

## 14. Supplier discovery and comparison

### Requirement definition

Before searching, capture product/service scope, specification, quantity, delivery location, purchase window, warranty/support needs, contract duration, and applicable procurement constraints.

### Supplier record

Name, website, relevant offering, evidence of geographic coverage, evidence of capability, pricing if published, quote requirements, contact source, date checked, and suitability rationale.

### Evidence labels

- Listed on supplier website.
- Supported by manufacturer or partner directory.
- Confirmed in uploaded quotation.
- Confirmed by organisation.
- Requires confirmation.

Discovery does not imply endorsement. Stock, partner status, lead time, and support claims require supporting evidence.

### Comparison

Compare requirement fit, acquisition costs, implementation, recurring costs, warranty, support, delivery, payment terms, quote validity, and evidence completeness. Missing facts remain unknown.

Users may set comparison criteria and weights. Any ranking explains its inputs and exclusions. Commercial relationships or sponsored placement must be visible.

### RFQ workflow

MVP generates an editable RFQ for the user to send. Uploaded responses attach to the requirement. A chosen quote updates the existing budget line after preview and preserves its previous estimate.

Automated external messages and supplier access are later features requiring explicit organisational authorisation.

## 15. Scenarios and tradeoffs

Default scenarios are Minimum, Recommended, and Expanded. Users can create custom alternatives.

Each scenario records included lines, quantities, timing, costs, protected commitments, and rationale for changes.

When asked to reduce spending, first establish protected items and dependencies. Proposed reductions show savings and operational consequences. Do not assume a contractual commitment can be cancelled or a dependent project can proceed without its prerequisites.

Compare total cost, monthly profile, category distribution, supported priorities, and unresolved estimates. Scenarios remain separate until explicitly applied to the working budget.

Scenario lines must not generate duplicate demand. Only the designated active planning version feeds the schedule.

## 16. Quality review and approval pack

### Review checks

Duplicates; missing quantities, prices, currencies, or rates; incorrect frequencies; renewal timing; missing related costs; unresolved dependencies; weak evidence; missing justifications; and inconsistencies between the ceiling and planned spend.

Checks are explainable and categorised as blocking calculations, requiring review, or optional improvements.

### Readiness

Readiness indicates completion of configured fields and checks. It does not imply management approval. Approval status is separately recorded by an authorised user in MVP; formal multi-stage approvals come later.

### Outputs

- Executive overview.
- Detailed annual and monthly budget.
- Major investment justifications.
- Scenario comparison.
- Supplier shortlist and procurement questions.
- Assumptions and evidence register.

Excel is the primary financial export. A PDF management pack is a companion output. Both use the same saved budget version, date, reporting currency, and financial assumptions.

## 17. Demand collection and sharing

### Demand record creation

An accepted purchasing line can be converted into a linked requirement. Sharing is explicit. A private preview shows exactly what the operator would receive.

For MVP, one purchasing requirement links to one budget line. Supporting project costs can remain separate. More complex grouping must avoid duplicate quantities and values.

### Sharing modes

| Mode | Operator visibility |
|---|---|
| Private | No requirement contents |
| Anonymous demand | Permitted aggregated attributes; no organisation or contact identity |
| Identified demand | Selected requirement fields plus authorised organisation identity |
| Supplier introduction | Separate permission to disclose selected fields to specified recipients |

Supplier introduction is an additional permission, not an automatic consequence of identified sharing.

### Permission record

Store who authorised sharing, their role, permitted fields, purpose, recipients where applicable, timestamp, and subsequent changes.

Revocation removes visibility from future operator views and aggregates. Explain that previously downloaded material cannot be technically recalled. Any historical aggregate retention policy must be defined and disclosed before launch.

## 18. Demand record specification

| Field | Purpose |
|---|---|
| Requirement ID and linked budget version | Traceability and deduplication |
| Organisation identity | Visible only when permitted |
| Sector | Segmentation |
| Category and normalised requirement | Grouping |
| Full specification | Determines compatibility |
| Quantity and unit | Measures demand |
| Allocation and currency | Optional; distinguish unpriced requirements |
| Allocation source | Estimate, quote, contract, or other |
| Location | Delivery or service coverage |
| Purchase-window start and end | Supports precise dates or quarter-level planning |
| Date precision | Prevents invented exact dates |
| Budget status | Funding progress |
| Procurement status | Buying readiness |
| Purchase flexibility | Phasing, alternatives, or timing constraints |
| Contact | Only with permission |
| Last confirmed and confirmed by | Freshness |
| Sharing policy | Access control |
| Change history | Explains revisions |

Subscriptions and services use seats, sites, coverage, renewal dates, or service scope as appropriate.

## 19. Status model

### Budget status

Draft → Submitted → Approved. A submitted or approved budget can require revision. Approval records the approver, date, and version; material edits create a revision requiring confirmation rather than silently preserving approval.

### Procurement status

Exploring → Seeking Quotes → Evaluating Quotes → Supplier Selected → Ordered → Purchased/Delivered.

Additional states: Delayed and Cancelled. Services can use Activated/Completed instead of Delivered. Changes record actor and date.

Approval and procurement statuses are independent. The schedule must not imply that all approved lines are active opportunities.

### Freshness

Current, Confirmation Due, or Stale, based on configurable confirmation policy. A approaching purchase window can trigger a prompt; no response does not imply cancellation or readiness.

## 20. Operator demand overview

Show participating organisations, planned allocations, approved allocations, requirements seeking quotes, upcoming purchases, unpriced requirements, and records requiring confirmation.

Each measure explains included statuses and sharing modes. Planned allocations are intentions, not revenue forecasts. Anonymous contributors can be counted only where privacy policy permits.

Keep currency totals separate unless an explicit reporting assumption is selected. Identify incomplete values and do not aggregate incompatible units.

## 21. Demand schedule and purchasing calendar

### Table columns

Organisation where permitted, requirement, specification summary, quantity/unit, allocation/currency, location, purchase window, budget status, procurement status, last confirmation, and next internal action.

### Filters

Organisation, sector, category, specification, location, currency, purchase period, approval, procurement readiness, freshness, and sharing visibility.

### Detail panel

Specification, linked source where permitted, evidence, history, sharing limits, authorised contact, and operator-only notes.

### Calendar

Month and quarter views show purchase windows. Multi-month windows are represented as ranges and are not counted repeatedly in demand totals. Unknown timing appears under Unscheduled.

### Operator actions

Save views, export permitted data, add internal notes, assign internal follow-ups, and prepare supplier shortlists. External communication requires separate authority.

## 22. Aggregate demand analysis

Group by compatible category/specification, period, geography, sector, and readiness.

For each group show quantity, units, contributing organisation count where permitted, allocation by currency, approved share, quote-seeking share, unpriced share, and confirmation freshness.

Do not combine unlike specifications as interchangeable goods. Keep entry-level laptops and engineering workstations distinct, for example. Allow broad category views with drill-down into specification groups.

Anonymous groups need a defined minimum disclosure threshold and protection against identifying organisations through narrow filters. The threshold and suppression rules must be settled before launch. Drill-down cannot bypass them.

Do not extrapolate participating organisations' demand into a claim about the entire Zimbabwe market without a defensible methodology.

## 23. Demand maintenance and operator follow-ups

Budget changes update linked shared requirements subject to the active version and sharing policy. Material changes are visible in history. Cancelled and completed requirements leave the active pipeline while retaining permitted historical records.

Organisations can confirm Still Planned, Delayed, Cancelled, or Purchased. Reminders are configurable and sent only through authorised channels.

Internal follow-ups contain owner, action, due date, status, and requirement link. Operator notes remain separate from organisation-owned content.

Bulk procurement is a later capability. A shared category alone does not authorise combining orders, disclosing identities, or committing an organisation to a purchase.

## 24. Roles and access

| Role | Typical permissions |
|---|---|
| Organisation administrator | Membership, settings, sharing policy, and permitted approvals |
| Budget owner | Edit budget, accept proposals, manage scenarios and exports |
| Contributor | Edit assigned content under workspace permissions |
| Reviewer | Read and comment; approval only if explicitly granted |
| Operator | Read consented demand and manage internal coordination |
| Platform support | Minimum access necessary for support under controlled procedures |

Enforce access at the data/service layer, not just by hiding interface controls. The operator cannot read private budgets through attachments, search, exports, or assistant context. Cross-organisation access tests are release requirements.

MVP may simplify organisation roles to administrator, editor, and viewer while preserving separation from the operator.

## 25. AI behaviour and failure states

### Supported actions

Explain, ask, draft, research, identify omissions, compare options, propose budget edits, prepare scenarios, and draft approval materials or RFQs.

### Boundaries

- No silent financial changes.
- No invented source links or supplier capabilities.
- No external contact without explicit authorisation.
- No promise of savings or outcomes unsupported by evidence.
- No disclosure of private data in research queries.
- Uploaded documents and web pages are treated as evidence, not instructions controlling the assistant.

### Failure handling

| Situation | User experience |
|---|---|
| Research unavailable | Preserve budget; explain that research is unavailable and allow retry |
| Source conflicts | Present differences and request verification |
| Missing price | Keep item unpriced and show its effect on completeness |
| Invalid import | Show row-level findings and let user correct mappings |
| Missing exchange rate | Retain original total and mark conversion incomplete |
| Stale supplier information | Show research date and offer refresh |
| Export failure | Preserve saved version and allow retry |
| Concurrent edit conflict | Resolve visibly; do not overwrite silently |
| Revoked sharing | Remove operator access and apply aggregate suppression rules |

## 26. Core data objects

Organisation; membership; organisation profile; budget; budget version; budget line; business objective; financial assumption; attachment; evidence source; recommendation; supplier; quotation; scenario; demand requirement; sharing authorisation; confirmation; internal follow-up; export; and audit event.

Key relationships:

- Organisation owns budgets and memberships.
- Budget versions contain lines and assumptions.
- Lines reference evidence, objectives, and dependencies.
- Scenarios derive from a specific budget version.
- Demand requirements link to active lines and their sharing authorisations.
- Supplier comparisons and quotes attach to requirements or budget lines.
- Operator follow-ups reference only accessible requirements.

Budget version snapshots and exports must remain reproducible. The live demand schedule reflects current authorised state rather than every historical snapshot.

## 27. MVP scope and release acceptance

| Capability | Acceptance condition |
|---|---|
| Workspace setup | User creates a custom-period budget with priorities and currency |
| Import | Mappings and ambiguous records are reviewed before import |
| Budget editing | Rows save, calculations reconcile, and changes can be undone |
| Financial assumptions | Original currencies persist and incomplete totals are labelled |
| AI suggestions | Proposed edits show financial impact and require acceptance |
| ICT research | Recommendations include dated supporting sources and uncertainties |
| Supplier discovery | Shortlists explain fit and do not invent missing facts |
| Scenarios | Alternatives remain separate until applied |
| Approval outputs | Spreadsheet and narrative use the same saved figures |
| Demand sharing | Private default and field-level preview work end to end |
| Operator schedule | Only authorised requirements appear with timing and status |
| Calendar | Unknown and broad date windows are represented accurately |
| Aggregation | Units, currencies, statuses, and privacy suppression are respected |
| Demand updates | Edits, cancellation, completion, and revocation update visibility |
| Access control | Cross-organisation and operator privacy boundaries pass verification |

### Outside MVP

Whole-company consolidation; formal multi-stage approvals; ERP integration; actual-spend synchronisation; supplier self-service portal; automatic supplier outreach; transactions; bulk ordering; automated negotiation; continuous research monitoring; and advanced accrual accounting.

## 28. Proposed delivery phases

### Phase 1 — Validate the workflow

Interview target ICT leaders, inspect permissioned sample budgets, test a clickable prototype, validate the shared-demand proposition, and agree data visibility rules.

### Phase 2 — Budgeting foundation

Implement workspace setup, import, structured lines, calculations, currencies, evidence, versioning, and spreadsheet export.

### Phase 3 — Decision support

Add guided AI planning, sourced recommendations, supplier shortlists, scenarios, and approval-pack generation.

### Phase 4 — Demand intelligence

Add sharing controls, linked requirements, operator schedule, calendar, aggregation safeguards, and confirmations.

### Phase 5 — Controlled pilot

Run complete budgeting journeys with participating organisations, verify calculation and permission boundaries, and refine usability before broader release.

These are sequencing recommendations, not delivery-date commitments. Demand sharing should be explained and consented from the start even if operator tooling ships later.

## 29. Success measures

### Organisation value

- Time from setup to first usable draft.
- Completion rate from draft to exported approval pack.
- Percentage of spend supported by evidence.
- Number of material omissions resolved.
- User-rated usefulness of recommendations.
- Repeat use across revisions and planning cycles.

### Demand value

- Organisations opting into each sharing level.
- Percentage of requirements with quantity, timing, and status.
- Percentage confirmed within the freshness policy.
- Approved and quote-seeking demand by category.
- Follow-ups completed and authorised RFQs prepared.

### Quality guardrails

Calculation discrepancies; unsupported research claims; erroneous imports; data-access incidents; incorrect aggregation; sharing complaints; and excessive reminder volume.

Set numerical targets after pilot baselines. Do not optimise sharing conversion at the expense of informed consent or organisation value.

## 30. Commercial model hypotheses

Potential models to test:

- Organisation subscription for budgeting and decision support.
- Paid onboarding or budget-preparation support.
- Paid operator analytics based on authorised aggregated demand.
- Disclosed supplier referral or sourcing fees where organisations agree.

Pricing and willingness to pay remain unvalidated. Supplier monetisation must not covertly influence recommendations. Budget quality and relevance remain ranking priorities.

## 31. Risks and mitigations

| Risk | Product response |
|---|---|
| Users distrust demand collection | Private default, clear purpose, granular sharing, and revocation |
| Estimates appear definitive | Visible evidence types, ranges, and unresolved assumptions |
| Demand becomes stale | Last-confirmed dates and configurable confirmation prompts |
| Supplier research is incomplete | Evidence labels, quote-required state, and dated refresh |
| Budgets are double-counted | Active-version rule, stable identifiers, and scenario exclusion |
| Anonymous data reveals identity | Thresholds, suppression, and restricted drill-down |
| Commercial incentives distort advice | Disclosures and explainable comparison criteria |
| Financial totals disagree | Deterministic calculations and version-consistent exports |
| Setup feels burdensome | Progressive questioning and import-first workflows |
| Scope expands too early | Complete departmental budgeting and demand scheduling first |

## 32. Illustrative end-to-end journey

An ICT manager creates a 2027 budget, uploads last year's spreadsheet, and identifies laptop replacement, improved backups, and software cost control as priorities.

Budget Buddy reviews the import, confirms quantities and renewal dates, and creates an editable draft. It flags missing backup implementation and recovery-testing costs. The manager requests research, reviews options, and obtains quotations outside the platform.

Uploaded quotations replace estimates after review. The manager compares a phased replacement scenario with the recommended plan, chooses one, and exports a spreadsheet and management pack.

The organisation authorises identified sharing for laptop procurement and anonymous sharing for selected software demand. Confidential lines remain private.

The operator sees the shared laptop requirement in the purchasing schedule, including quantity, specification, allocation, quarter, and procurement status. Anonymous software requirements contribute only to eligible aggregates.

After budget approval, the manager confirms readiness for quotations. The operator prepares a supplier shortlist. Any supplier introduction requires the organisation's separate permission.

When laptops are delivered, the organisation marks the requirement complete. It leaves the active demand pipeline while the permitted history remains available.

## 33. Open decisions before implementation

1. Initial pilot sectors and organisation sizes.
2. Pilot recruitment and access to sample budgets.
3. Whether the operator is also a sourcing business and how that relationship is disclosed.
4. Required accounting conventions and finance-review expectations.
5. Tax configuration and supported currency policies.
6. Research sources, refresh rules, and supplier-verification standards.
7. Anonymous aggregation thresholds and retention policy.
8. Organisation membership and approval permissions for MVP.
9. Reminder channels, authorisation, and cadence.
10. Hosting, data retention, deletion, security, and support-access policies.
11. Subscription or service pricing hypotheses to test.
12. Whether PDF approval-pack export is required for the pilot or follows Excel export.

## 34. Next design deliverables

- Organisation and operator journey maps.
- Low-fidelity screens for setup, budget editing, research, sharing, and demand scheduling.
- Clickable prototype covering one complete journey.
- Reviewed calculation examples and edge cases.
- Data-access and sharing matrix.
- Prioritised implementation backlog based on the MVP acceptance conditions.

The product should ultimately make each purchasing decision traceable from business need to budget allocation, evidence, approval, and authorised procurement demand.
