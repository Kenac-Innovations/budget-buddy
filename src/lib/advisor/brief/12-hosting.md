# Virtualisation licensing changes and on-premises vs cloud hosting

Status: DRAFT, awaiting Kenac review
Review date: 2026-10-14 (draft preparation; no Kenac sign-off)
Next review: 2027-01-14, or sooner if source guidance changes

## What it is
Some established virtualisation portfolios have changed licensing models. A January 2024 supplier announcement ended the sale of perpetual licences and of support renewals for them, moving customers to subscription bundles typically priced per CPU core with a per-processor minimum. For budgeting this usually means: a recurring rather than one-off cost, a cost driven by licensed cores rather than hosts, and a renewal that may require moving to a bundle. It does not establish the terms of an individual renewal today; verify the organisation's own entitlement, core count and renewal date before planning.

## Who it fits in Zimbabwe
Planning judgement: investigate renewal scope before a forced migration. Compare keeping the present platform, a supported alternative and suitable hosted workloads using evidenced ownership and operating costs. Cloud is not automatically cheaper.

## When it is hype or premature, and prerequisites
Premature: a wholesale move driven by headlines. Prerequisites: workload dependencies, support terms, recovery design, connectivity, data-handling review, skills and a measured migration pilot.

## Common failures
Common failures to check: unexamined renewal entitlements, overlooked data transfer/storage costs, migration downtime or applications tied to old infrastructure. Include backup, support, training and an exit route; leave costs unpriced.

## Questions to ask
What operational problem would a move solve? Can the team operate and recover the proposed destination?

## Sources with dates
[Virtualisation supplier licensing announcement](https://blogs.vmware.com/cloud-foundation/2024/01/22/vmware-end-of-availability-of-perpetual-licensing-and-saas-services/), published 2024-01-22, accessed 2026-10-14; historical change only. Advice uses platform categories, never the supplier as a recommendation.

Local fit, sequencing and failure checks are draft planning judgements for Kenac to review. They are conditional, not assertions of local prevalence or guaranteed outcomes.
