# Segmented

A pill-shaped toggle for two to four mutually exclusive filters or views, such as My KPAs, My team or Department.

**Source:** `Segmented` in `src/components/ui.tsx`; `.hf-seg` in `globals.css`.

**Spec:** a `bg` track with a 1px `line` border, `r-pill` and 3px padding. Buttons are 13.5px semibold `ink-2` with 7px 16px padding; the active button gets a `surface` fill, navy text and `sh-sm`. The `sm` size uses 7px 13px padding and 12.5px text.

**The consumer provides** `options` (key, label, optional icon), `value`, `onChange` and `size`.

- Use it to scope the same content (whose KPAs, chart or directory view). For different content use Tabs.
