# StatCard

A summary tile with a tinted icon, one big number and a label, used in rows at the top of admin and HR dashboards.

**Source:** `src/components/admin/ui/stat-card.tsx`.

**Spec:** `card` fill, 1px `border`, `radius-xl`, 16px 20px padding, 14px gap. The icon tile is 40px at `radius-lg` with a 19px icon. The value is 22px bold with tight tracking; the label is 13px `muted-foreground`, with an optional 12px sub-line at 70% opacity.
**Tones:** `default` (`muted`), `primary` (navy on `accent`), `success`, `warning`, `destructive` (status colour on its `-bg`).

**The consumer provides** `icon` (lucide name), `value`, `label`, optional `sub`, and `tone`.

- Use StatCards only when the counts are what the page is for, and no more than four in a row.
- Choose the tone from what the number means ("6 Escalated reviews" is `destructive`), not to decorate.
