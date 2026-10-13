# EmptyState

The centred message shown when a table or list has nothing to display.

**Source:** `src/components/admin/ui/empty-state.tsx` (`AdminEmptyState`).

**Spec:** 56px vertical padding, a 44px round `muted` icon disc with a 20px icon, a 14px medium title, a 14px `muted-foreground` description up to 24rem wide, and an optional action 20px below.

**The consumer provides** `title`, an optional `description`, `icon` (default `search`), and an optional `action`.

- The title states what is missing in the user's terms: "No events match your filters", "No roles match your search".
- Offer the next step as an outline button ("Clear filters"), not a primary one.
