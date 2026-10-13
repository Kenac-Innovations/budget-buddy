# Tooltip

A small navy label that appears on hover or focus to explain an icon button or a rule.

**Source:** `src/components/ui/tooltip.tsx`.

**Spec:** `navy` fill with white 12px text, 6px 10px padding, `radius-md`, a medium shadow and a rotated-square arrow. It fades and zooms in.

**The consumer provides** the trigger and one short sentence.

- Keep it under about 8 words. Longer explanations go in an InfoTip popover.
- Known issue: the text is a literal white, so in dark mode it reads on the light grey-blue `navy` at about 1.9:1. Fix this in code by using `hf-primary-foreground`; this rendition copies the source as it is.
