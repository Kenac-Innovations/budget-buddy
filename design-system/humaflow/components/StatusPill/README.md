# StatusPill

The rounded pill with a coloured dot that shows a KPA's status: No status, On track, At risk, Off track, Closed.

**Source:** `StatusPill` in `src/components/ui.tsx`, with the `STATUS` map in `src/lib/data.ts`. Classes `.hf-pill`, `.hf-pill-md|sm`, `.hf-dot` are copied from `globals.css`.

**Sizes:** `md` (4px 12px, 12.5px) and `sm` (3px 9px, 11.5px). Weight 600, `r-pill` radius, a 7px dot. Colours by status: `green`/`green-bg`, `amber`/`amber-bg`, `red`/`red-bg`, `grey`/`grey-bg`, `slate`/`slate-bg`.

**The consumer provides** `status`: one of `none`, `on`, `risk`, `off`, `closed`. Labels come from the map; never pass custom text.

- Show the pill wherever a KPA, KPI or employee row has a status, and keep the same status colours on its ProgressBar.
- The dot plus the word carries the meaning, because the light-mode pill colours are below 4.5:1.
