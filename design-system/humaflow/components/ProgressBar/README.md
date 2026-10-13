# ProgressBar

The thin rounded bar that shows progress towards a KPA or KPI target, filled in the item's status colour.

**Source:** `Bar` in `src/components/ui.tsx`; `.hf-barwrap`, `.hf-bar`, `.hf-bar-fill`, `.hf-bar-pct` from `globals.css`.

**Anatomy:** a `surface-2` track at `r-pill`, 8px high by default, a fill in the status colour (transparent at 0%), and an optional percentage in `meta` style (`ink-2`). The fill animates its width over 0.6s.

**The consumer provides** `value` (0–100, clamped), `status` (same keys as StatusPill), and optionally `height`, `showPct` and `width`.

- Always colour the fill by status, not by the brand: navy fills are reserved for charts.
- Pair the bar with the item title above or beside it. Do not use it for upload or loading progress.
