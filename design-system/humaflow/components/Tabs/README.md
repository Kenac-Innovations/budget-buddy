# Tabs

Switches between views of one object: shadcn `Tabs` with a `default` (pill track) or `line` (underline) variant, and the legacy `.hf-tabs`.

**Source:** `src/components/ui/tabs.tsx`; `.hf-tab` and `.hf-tabs-bordered` in `globals.css`.

**shadcn:** the list is 36px high with a `muted` track, 3px padding and `radius-lg`. Triggers are 14px medium at 60% `foreground`; the active one gets a `background` fill and a small shadow. In the `line` variant the active trigger shows a 2px `foreground` underline instead.
**Legacy:** 14.5px semibold `ink-2` tabs. The active tab turns navy with a 2.5px navy underline; the bordered variant sits on a `line` rule.

**The consumer provides** the tab labels, the active value and the panels.

- Use `default` for in-card switches and `line` or the legacy bordered style for page-level sections.
- Labels are nouns, two words at most.
