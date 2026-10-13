# Card

The white container that groups one topic on a screen: an appraisal, a KPA list, a chart.

**Source:** `src/components/ui/card.tsx` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter). The legacy `.hf-card` has a 16px `r-card` radius, 20px padding and `sh-card`.

**Spec:** `card` fill, 1px `border`, `radius-xl`, 20px vertical padding with 20px side padding on each part, 20px gap between parts, a faint two-layer shadow. Title is 15px semibold, with an optional 16px lucide icon; the description is 14px `muted-foreground`.

**The consumer provides** the header (title, an optional description, an optional right-aligned pill or action), the content, and an optional footer of buttons.

- One topic per card. Put dashboard cards in a grid with an 18px gap (`grid-gap`).
- Separate cards with their border, not heavier shadows. No coloured left-border stripes.
