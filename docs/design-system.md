# Design system: Humaflow (Kenac)

Budget Buddy uses Kenac's Humaflow design system, vendored in `design-system/humaflow/` (synced from `Kenac-Innovations/humaflow-fe` at `dev@669a2e3`, 8 October 2026). The README there is the rulebook for colour, type, spacing, states, motion and copy. This page records how Budget Buddy applies it, and the review findings.

## How it is wired

| Piece | Where |
|---|---|
| Tokens (source of truth) | `design-system/humaflow/tokens.json` |
| Generated CSS variables | `src/styles/tokens.css`, from `pnpm tokens` (`scripts/build-tokens.mjs`). Don't edit by hand. |
| Tailwind mapping + type styles | `src/app/globals.css`: `@theme inline` exposes the shadcn names (`bg-primary`, `text-muted-foreground`) and the app names (`bg-surface`, `text-ink-2`, `bg-green-bg`). Type styles are utilities: `text-page-title`, `text-card-title`, `text-meta`, `text-eyebrow`. |
| Font | Hanken Grotesk 400–800 via `next/font`. Body is 14px with `tnum` and `cv11`, so figures in tables line up. |
| Dark mode | `.hf-theme-dark` on `<html>`, as in Humaflow. The choice is stored per browser (`bb-theme`); the first visit follows the system. The Tailwind `dark:` variant is mapped to the class. |
| Components | `src/components/ui/`: Button, Badge, StatusPill, Card, StatCard, PageHeader, EmptyState, ProgressBar. `src/components/shell/app-shell.tsx`: 236px sidebar, 68px topbar, 1240px screen, drawer at ≤900px. |

To update the system: replace `design-system/humaflow/`, run `pnpm tokens`, review the diff.

## Choices for Budget Buddy

1. **New components only.** Humaflow has three layers: shadcn primitives, admin composites and legacy `.hf-*` CSS. Budget Buddy is new, so it uses the first two only. No `.hf-*` classes, and no `.sb-scope` wrapper: Tailwind preflight is loaded here, so border defaults already work.
2. **Its own fixed status vocabulary**, following the Humaflow rules (sentence case, dot + word, no custom text). It lives in `status-pill.tsx`:

   | Domain | Labels |
   |---|---|
   | Budget | Draft · Submitted · Approved |
   | Evidence | Contract · Quote (green) · Kenac price list · Published price · Past spend (slate) · Own estimate (amber) · Unpriced (red) |
   | Sharing | Private · Shared with Kenac |

3. **Brand: "Budget Buddy by Kenac Computer Systems".** It uses the text wordmark the way Humaflow does, with a navy product mark holding a lucide `Wallet`. Kenac offers carry a `secondary` "Kenac" badge (the disclosure from decision D2), not teal, because teal is never a second action colour.
4. **Copy follows Humaflow's voice.** It's plain, procedural and second person, and says what happens next ("Request a quote or match it to the Kenac price list to complete the budget."). The terminology rules about KPAs don't apply here.
5. **Status, not brand, colours progress.** The ceiling bar is green, then amber above 90%, then red above 100%. Navy is used only for the cash-profile chart (`chart-1`).

## Review findings

What works well for a finance product:
- Tabular numerals globally, weight-led hierarchy and quiet borders fit dense budget tables.
- The rule that colour never carries meaning alone (dot + word) maps directly onto evidence and completeness states.
- "Errors say what to do" and "toasts confirm in past tense" fit the spec's principles ("Unknown is a valid state", "AI proposes; users accept").

Issues to raise with the Humaflow team, so we fix them upstream instead of forking:

| # | Issue | Impact here | Suggested fix |
|---|---|---|---|
| R1 | **The package ships no CSS variables.** The previews expect a host to inject them, so they render unstyled when opened directly. | We had to write a token→CSS generator. | Ship `tokens.css` (light + `.hf-theme-dark`) next to `tokens.json`. Our `scripts/build-tokens.mjs` can be contributed back. |
| R2 | **Status text below WCAG AA in light mode:** green 3.1:1, amber 2.5:1 and grey 2.7:1 on their fills. `ink-3` is 3.1:1, and white on `destructive` is 4.3:1. | Finance reviewers read evidence pills on dense tables. The amber "Own estimate" pill is the hardest to read. | Add darker `*-text` tokens for status words (e.g. amber text around `#8a6100`) and keep the current hues for dots and fills. We use the tokens as shipped for now. |
| R3 | **Tooltip uses literal white text** and reads at 1.9:1 in dark mode (known issue in its README). | We haven't built a Tooltip yet. When we do, it will use `hf-primary-foreground`. | Fix in source as the README says. |
| R4 | **Two radius scales** (shadcn `radius-*` and legacy `r-*`) and two button systems. | None, since we use only the shadcn scale. | Retire `r-*` as screens migrate. |
| R5 | `--top-h` and `--navy-300` are referenced but never defined. | None. | Define or remove. |
| R6 | **There is no info hue by design.** Informational panels use navy on `hf-primary-soft`. | The "total is incomplete" banner uses navy-soft. That's correct per the system, but it looks the same as selection. | Acceptable; keep it. |
| R7 | **Tenant theming** recomputes brand shades at runtime from each tenant's primary. | Budget Buddy is multi-tenant, but the brand is Kenac's. | Don't enable tenant colours. Allow a tenant logo in the sidebar later. |

## Not built yet

DataTable (sorting, toolbar, skeletons), Modal and ConfirmDialog, Input and form fields, Tabs, Segmented, Toast, Tooltip. Each will follow its spec in `design-system/humaflow/components/<Name>/README.md` as the screen that needs it is built.
