# Sidebar

The app's left navigation: the tenant brand on top, then the nav items, with the active item filled navy.

**Source:** `src/components/App.tsx` and `TenantSidebarBranding.tsx`; `.hf-sidebar`, `.hf-navitem`, `.hf-nav-badge`, `.hf-product-mark` in `globals.css`.

**Spec:** 236px wide (`sb-w`), a `surface` fill with a `line-2` right border. The brand block is at least 80px high and shows the tenant logo (up to 176 × 44px) or the text wordmark (22px, -0.035em, navy) over "Performance Management". Nav items are at least 46px high with 11px 14px padding, an 8px radius, 14px medium `nav-muted` text and 19px icons. Hover fills `nav-accent`; the active item fills `nav-primary` with `nav-primary-fg` text at 600 and `sh-sm`. Count badges are 23px navy pills that invert on the active item. Below 900px the sidebar slides in over a scrim.

**The consumer provides** the nav items (icon, label, count, route), the active route and the tenant branding.

- User nav order: Home, KPAs, Tasks, Appraisals, Learning, Approvals, My Team, then HR-only items, then Help and support.
- The Admin center uses grouped nav with 11px uppercase group labels (Overview, Users, Organization, Settings, Modules, Governance).
- Counts show only things waiting on the viewer.
