# Modal

The centred dialog for creating or confirming something, with a header, a scrolling body and a recessed footer of actions.

**Source:** `Modal` in `src/components/ui.tsx`; `.hf-overlay`, `.hf-modal`, `.hf-modal-head|foot` in `globals.css`. New admin dialogs use shadcn `Dialog`/`AlertDialog` through `FormDialog` and `ConfirmDialog` (`rounded-lg`, `p-6`, black 50% overlay).

**Spec:** a `scrim` overlay with a 2px blur. The box has a `surface` fill, an 18px radius and `sh-pop`, and is 920px wide by default. The header has 20px 26px padding, a `modal-title` heading (19px, 800), an optional 13px `ink-3` subtitle, and a 34px close button. The footer has 16px 26px padding on `surface-2` with buttons right-aligned and a 10px gap. It pops in over 0.18s and closes on Escape or a click outside.

**The consumer provides** `open`, `onClose`, `width` and the children (head, body, foot).

- Title the modal with the action ("Create KPA", "Submit self-assessment"). The confirm button repeats the verb.
- Footers read secondary then primary, left to right.
- Use the subtitle to say what happens next: "Your manager will be notified and your scores will be locked."
