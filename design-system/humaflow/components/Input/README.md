# Input

The single-line text field, with a label above and an optional hint or error below.

**Source:** `src/components/ui/input.tsx` and `label.tsx`. The legacy `.hf-input` (9px 12px padding, `line-2` border, `r-sm`, navy focus border with a 3px `hf-primary-soft` halo) is shown in the Modal preview.

**Spec:** 36px high, `radius-md`, 1px `input` border, transparent fill (30% `input` in dark), 12px side padding, 14px text, `muted-foreground` placeholder. On focus the border becomes `ring` with a 3px halo at 50%. With `aria-invalid="true"` the border becomes `destructive` with a 20% halo.

**The consumer provides** a `<label>` tied by `id`, the value, a placeholder showing an example ("e.g. 95% on-shelf availability"), and `aria-invalid` plus an error line when validation fails.

- Labels are short nouns with units in brackets: "KPI weight (%)".
- Errors explain the fix in a full sentence and appear under the field in `destructive`.
