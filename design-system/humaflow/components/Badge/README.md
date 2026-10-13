# Badge

A small rectangular label for a role, an attribute or a short state in tables and headers.

**Source:** `src/components/ui/badge.tsx`. Static rendition.

**Variants:** `default` (navy fill), `secondary`, `outline`, `destructive`, and the four status tones `success` (`green` on `green-bg`), `warning` (`amber` on `amber-bg`), `danger` (`red` on `red-bg`), `muted` (`slate` on `grey-bg`). 12px medium text, 2px 8px padding, `radius-md`, 1px border (transparent except `outline`).

**The consumer provides** one to three words and an optional 12px icon.

- Use Badge for attributes ("Admin", "Head Office", "Inactive"). For KPA progress status use StatusPill instead: it carries the dot and the fixed vocabulary.
- Light-mode `success` and `warning` text is below 4.5:1 on its fill. Keep the words meaningful on their own and never rely on the colour alone.
