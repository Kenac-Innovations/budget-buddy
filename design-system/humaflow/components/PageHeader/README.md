# PageHeader

The title row at the top of every Admin center page: an optional back button, an icon tile, the page title, and actions on the right.

**Source:** `src/components/admin/ui/page-header.tsx` (`AdminPageHeader`).

**Spec:** 24px bottom margin; the icon tile is 40px, `accent` fill, navy 20px icon, `radius-lg`. The title uses `page-title` (22px bold, tight tracking). Actions sit right with an 8px gap; a page description goes in an info tip beside them, not under the title. Optional tabs sit 20px below.

**The consumer provides** `title`, an optional `icon`, `actions` (buttons), `description`, `tabs` and `onBack`.

- Titles are the nav label of the page ("Roles & Permissions", "Audit logs").
- At most one primary button in `actions`, placed last.
