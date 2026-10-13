# DataTable

The sortable admin table inside a bordered card, with an optional toolbar above and footer below.

**Source:** `src/components/admin/ui/data-table.tsx` (`AdminDataTable`), built on `src/components/ui/table.tsx`.

**Spec:** a `card` wrapper with 1px `border`, `radius-xl` and a hairline shadow. The toolbar and footer have 12px 16px padding. Header cells are 40px high, 12px semibold uppercase `muted-foreground` with 0.025em tracking. Body cells have 8px padding and 14px text, and rows are separated by `border`. Hovered rows tint `muted` at 50%. Loading shows skeleton rows. Numbers are right-aligned and tabular.

**The consumer provides** `columns` (key, header, align, sortable, render), `rows`, an optional `toolbar` (search and actions), an optional `footer`, `loading`, and `onRowClick`.

- Put the person or object name in the first column, with secondary info in 12px `muted-foreground` below it.
- Show status with StatusPill inside a cell. Never colour a whole row.
