# Toast

A short confirmation shown after an action completes, such as "Scale saved."

**Source:** `.hf-toast` in `globals.css` (centred at the bottom, `navy-800` pill, `toast-check` icon). Newer admin screens use Sonner (`src/components/ui/sonner.tsx`), bottom-right on `popover` with lucide CircleCheck, Info, TriangleAlert and OctagonX icons.

**Spec:** an `r-pill` shape with 12px 20px padding, 14px semibold `on-brand` text on `hf-primary-deep`, a 9px gap, `sh-pop`, and `z-toast` (200).

**The consumer provides** one sentence in past tense ("Role assignment updated."), or for errors, the fix ("Choose a PNG or JPG image.").

- Toasts confirm; they never carry the only copy of important information or an undo for a signed record.
