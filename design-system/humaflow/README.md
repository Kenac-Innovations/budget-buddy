Humaflow is a multi-tenant HR performance management platform. Employees agree KPAs (Key Performance Areas) and KPIs (Key Performance Indicators) with their manager, track tasks and evidence, complete a self-assessment, receive a manager assessment, and sign off. HR runs the cycle from the Admin center. The interface should feel calm, exact and accountable: every appraisal ends up as a signed, audited record, so the UI never feels casual about it.

The system is navy-first and neutral. One brand hue (`hf-primary`) carries action and selection, four status hues carry state, and everything else is cool grey.

## Content fundamentals

**Voice.** Plain, procedural, second person. Tell people what happens next and who is waiting on whom: "Your manager will be notified when you submit." No exclamation marks, no emoji, no jokes. Never make a review sound optional or playful.

**Casing.** Sentence case for buttons, titles, menu items and toasts: "Save changes", "Submit self-assessment", "Add succession plan", "No roles match your search". Product nouns keep their capitals: KPA, KPI, Admin center, Organogram. One exception exists in the product: review statuses such as "Waiting for Signature". Match the existing string when you show a status, and write new statuses in sentence case ("Self-appraisal pending").

**Terminology.** Use KPA and KPI, never KRA, KPR, OKR or "goal" in user-facing copy (the app rewrites old terms automatically). The cycle runs KPAs → KPIs → Tasks → Evidence → Self-assessment → Manager assessment → Sign-off. Name people by role in relation to the viewer: "your manager", "direct reports".

**Buttons** start with a verb and name the object: "Add KPI", "New task", "Import Excel", "Preview and validate". The dismiss action is "Cancel". Destructive confirmations name the loss: "Discard changes", "Discard and close", and the safe choice is "Keep editing".

**Toasts** confirm in past tense and end with a full stop: "Scale saved.", "Role assignment updated." **Errors** say what to do: "Choose a PNG or JPG image.", "Logo files must be 5 MB or smaller."

**Status labels** are fixed vocabulary. Use them exactly:

| Domain | Labels |
| --- | --- |
| KPA status | No status · On track · At risk · Off track · Closed |
| Task status | To do · In progress · In review · Done |
| Priority | High · Medium · Low |
| Review | Self-appraisal pending · Waiting for reviewer · Waiting to be finalized · Waiting for Signature · Finalized |

**Brand names.** Never write "Teamflect" anywhere; `tests/palette.test.ts` fails the build on it.

## Visual foundations

### Colour

- Ground every screen on `bg`; put content on `surface` cards; recess footers, side panels and tracks on `surface-2`.
- Text is `ink`, then `ink-2` for descriptions and inactive states. Use `ink-3` only for small repeated labels, hints and placeholders: it is below 4.5:1 in light mode.
- `hf-primary` is the only action colour. Use it for one primary button per view, the active nav item, the active tab underline, links and the focus ring. Put text on it in `hf-primary-foreground`, never a literal white, because dark mode inverts it.
- Washes: `hf-primary-soft` for selected rows and the input focus halo, `accent` for button hovers, `hf-primary-soft-strong` for text selection.
- Status always comes as a pair: `green`/`green-bg` (On track), `amber`/`amber-bg` (At risk), `red`/`red-bg` (Off track, errors), `grey`/`grey-bg` (No status), `slate`/`slate-bg` (Closed). Always show the label word or a dot with the colour. The light-mode green, amber and grey pairs are below 4.5:1, so colour alone must never carry the meaning.
- There is no info hue. Informational panels use navy text on `hf-primary-soft`.
- `teal` is the tenant accent. Keep it to self-development KPAs and avatars, never a second button colour.
- Charts take `chart-1` to `chart-5` in order. The set is colour-vision-deficiency checked as a sequence; skipping around breaks that.
- Banned: purple, violet, indigo, pink and plum hexes, and the retired blue brand (`#013B71`, `#024A8C`, `#2A6DB0` and family). `chart-5` is the single allowed violet. A palette test enforces this across `src` and `docs`.
- shadcn components use the semantic names (`primary`, `muted`, `accent`, `border`…), which alias the app tokens. In new code prefer the semantic names; the `navy-*` names are legacy aliases.

### Tenant theming

Each tenant sets a primary colour, accent, radius and logo. At runtime the app derives the brand shades from the tenant primary: hover is 88% primary mixed with white, active is 86% mixed with black, deep is 70% mixed with black, soft is 7% primary on white, soft-strong 16% and border 30%. In dark mode the primary itself becomes 70% primary mixed with 30% white, with `#111518` text on it. Never hard-code navy hexes in components: reference `hf-primary` or `primary` so a tenant's brand flows through. Tenant branding wins over a user's stored theme on first paint.

### Dark mode

Dark mode is a neutral charcoal, not a navy night. Surfaces step up from `bg` `#0c0d0f` to `surface` and `surface-2`; status colours lighten and their fills darken so pills stay legible. The brand primary turns into a light grey-blue with near-black text. In the app it is switched by the `hf-theme-dark` class on the root element, and the Tailwind `dark:` variant is mapped to that class. Each user's choice is stored per browser.

### Typography

- One family: Hanken Grotesk (400–800) from Google Fonts, with a system sans fallback. Body text is 14px, line-height 1.45, with tabular numerals (`tnum`) and `cv11` switched on globally, so numbers in tables and scores line up without extra classes.
- Hierarchy comes from weight more than size. Headings run 700–800 at 15.5–22px, and only the Home greeting reaches 30px. Use `page-title` for admin page headings, `modal-title` in modals and `card-title` on cards.
- The workhorse sizes are 13, 12.5 and 12px. Use `meta` for pills, dates and percentages and `eyebrow` (uppercase, 0.06em tracking, `ink-3`) for group labels.
- Do not ask for weights above 800: the font is only loaded up to 800, and 850 or 900 in old CSS render as synthetic bold.

### Spacing and layout

- The shell is a 236px sidebar (`sb-w`), a 68px topbar, and a scrolling screen capped at 1240px with 30px top and 34px left padding.
- Cards pad 20px (`card-pad`) and sit 18px apart (`grid-gap`). Modals pad 20px 26px in the header and 16px 26px in the footer.
- shadcn layouts use Tailwind's 4px scale (`gap-2`, `px-5`). Hand-written `.hf-*` CSS uses literal pixels, including half steps (13.5px, 11px). Copy the exact value rather than snapping to the grid.
- At 900px and below (`bp-nav`) the sidebar becomes an off-canvas drawer behind a scrim.

### Radii, borders and shadows

- Corners are soft but not round. Cards and table wrappers use 16–18px (`r-card`, `radius-xl`), buttons and inputs 8–12px (`r-sm`, `radius-md`), modals 18px. Pills, the segmented control, progress bars, nav badges and toasts are fully rounded (`r-pill`).
- Borders do the separating. Every card has a 1px `line` border; inputs and outline buttons take the stronger `line-2`. Shadows stay faint: `sh-card` at rest, `sh-pop` only for floating layers (modals, popovers, toasts).
- No left-border accent stripes on cards. The one exception in the app is the help tip panel (3px navy left rule on `surface-2`).

### States and focus

- Every focusable element gets a 2px solid `ring` outline at a 3px offset. shadcn inputs swap this for a `ring` border plus a 3px halo at 50% alpha. Legacy inputs use a navy border with a 3px `hf-primary-soft` halo.
- Hover fills: `accent` for shadcn buttons, `surface-2` for ghost buttons, rows and menu items, `nav-accent` for sidebar items.
- Selected: navy text on `hf-primary-soft`, or a full `nav-primary` fill for the active nav item.
- Disabled: 50% opacity for shadcn controls; legacy primary buttons switch to `hf-primary-border`.
- Invalid fields: `destructive` border with a 20% destructive halo.

### Motion

Keep motion short. Hovers transition in 0.12–0.14s. Modals pop in over 0.18s with a slight overshoot (`cubic-bezier(.34,1.4,.5,1)`, from scale .975 and 8px down). shadcn overlays fade and zoom from 95%. Progress bars fill over 0.6s. Everything resets under `prefers-reduced-motion`.

## Iconography

- Icons are **lucide** (`lucide-react`), outline style. The app's `Icon` wrapper defaults to 18px with a 1.7 stroke; nav icons are 19px, button icons 15–17px, and shadcn controls size SVGs to 16px.
- Icons inherit `currentColor`. On navy fills they take `hf-primary-foreground`.
- Common mappings: Home (home), Target (KPAs and the product mark), SquareCheckBig (tasks), ClipboardCheck (appraisals), Network (organogram), Users (team), Settings (Admin center), Sparkles (AI guidance).
- No emoji anywhere in the UI.
- **Logo.** Humaflow has no logo file. The default brand is the text wordmark "Humaflow" set in `wordmark` style in navy, with the caption "Performance Management" (11px, 600, `ink-3`). Beside it, the product mark is a 28px `nav-primary` square with 7px corners and a 16px lucide Target in `nav-primary-fg` (Settings in the Admin center). Tenants may upload their own logo, shown at up to 176 × 44px.

## Components

The codebase has three layers. New work uses the first two.

1. **shadcn/ui primitives** (`src/components/ui/`, new-york style): Button, Badge, Input, Card, Table, Tabs, Dialog, AlertDialog, Select, DropdownMenu, Popover, Tooltip, Checkbox, Switch, Toggle, Skeleton, Sonner. They only render correctly inside an `.sb-scope` element, which restores the border defaults that the app deliberately leaves out (Tailwind preflight is not loaded).
2. **Admin composites** (`src/components/admin/ui/`): AdminPageHeader, AdminDataTable, AdminToolbar, AdminEmptyState, StatCard, ChartCard, FormDialog, ConfirmDialog, AdminSettingsSection.
3. **Legacy `.hf-*` components** (`src/components/ui.tsx` and `globals.css`): StatusPill, Bar, Segmented, Modal, Card, Tag, Avatar, the sidebar and the toast. These are still on most user-facing screens. Match them when you extend those screens.

Unlayered `.hf-*` rules always beat Tailwind utilities, which live in cascade layers. Do not mix a `.hf-*` class and a utility on the same property.

The previews here are static renditions in plain HTML and CSS. They copy the source class values exactly but are not the React components.

## Not synced

Taken from `Kenac-Innovations/humaflow-fe` at `dev@669a2e3`. Left out:

- The React components themselves. Previews are static and the library was not built.
- The runtime-only tokens `--top-h` and `--navy-300`, which are referenced in CSS but never defined.
- The 5,000-line `.hf-*` screen stylesheet, beyond the components shown here.
- The avatar palette in `src/lib/demo-data.ts`.
- Font files, because Hanken Grotesk is served by Google Fonts.

Light-mode brand shades are the values written in `globals.css`. A running app recomputes them from the tenant primary, so the default tenant renders slightly greyer washes: soft `#eef1f2` and border `#b8c2c8`.
