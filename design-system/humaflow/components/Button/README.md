# Button

The action control: shadcn `Button` for new work, the legacy `Btn` (`.hf-btn`) on screens that already use it.

**Source:** `src/components/ui/button.tsx` (cva) and `Btn` in `src/components/ui.tsx`. Hand-written static rendition.

**Variants (shadcn):** `default` (navy fill, `primary` / `primary-foreground`), `outline` (`card` fill, `border`, hover `accent`), `secondary` (`secondary` fill, navy text, hover `accent`), `ghost` (transparent, hover `accent`), `destructive` (`destructive` fill), `link` (navy text, underline on hover).
**Sizes:** `default` 36px high with 16px side padding · `sm` 32px, 12px padding, 13px text · `lg` 40px, 24px padding · `icon` 36px square. Radius `radius-md`, 14px medium text, 6px gap, 16px icons.
**Legacy `Btn`:** `variant` primary / outline / ghost, `size` md (9px 15px, 14px) or sm (6px 11px, 13px, 7px radius), weight 600, radius `r-sm`. Disabled primary turns `hf-primary-border`.

**The consumer provides** the label (`children`), an optional leading lucide icon, `onClick`, and `disabled`. The shadcn version needs to sit inside an `.sb-scope` ancestor.

- One `default` (primary) button per view, for the action the screen exists for: "Submit self-assessment", "Add KPI".
- Labels are verb + object in sentence case. The dismiss button is "Cancel".
- Use `destructive` only in a confirmation step, and name the loss ("Discard changes"). Put the safe choice ("Keep editing") beside it.
- Do not pair a shadcn button and a legacy `Btn` in the same footer.
