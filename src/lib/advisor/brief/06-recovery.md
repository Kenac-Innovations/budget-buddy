# Backup and ransomware recovery

Status: DRAFT, awaiting Kenac review
Review date: 2026-10-14 (draft preparation; no Kenac sign-off)
Next review: 2027-01-14, or sooner if source guidance changes

## What it is
Backups are useful only if the required service can be restored. The 3-2-1 pattern is a planning heuristic: retain multiple copies across different media with an off-site copy; also isolate or protect a copy from destructive access.

## Who it fits in Zimbabwe
Planning judgement: fund tested recovery of essential services before adding advanced monitoring where recoverability is unknown. Keep working backup tooling if demonstrated recovery meets business tolerances.

## When it is hype or premature, and prerequisites
Premature: treating immutable storage or a successful backup job as a recovery guarantee. Prerequisites: agreed recovery time and data-loss tolerances, separate access controls, application dependencies and an isolated restore test.

## Common failures
Common failures to check: backups deleted with production credentials, missing configuration or keys, cloud workloads omitted and restores too slow for the business. Include storage, restore exercises and runbook ownership.

## Questions to ask
When was an essential service last restored successfully? A broad answer is enough; do not ask for sensitive system names.

## Sources with dates
[CISA StopRansomware guide](https://www.cisa.gov/stopransomware/ransomware-guide), September 2023, accessed 2026-10-14; recommends isolated backups and regular recovery testing.

Local fit, sequencing and failure checks are draft planning judgements for Kenac to review. They are conditional, not assertions of local prevalence or guaranteed outcomes.
