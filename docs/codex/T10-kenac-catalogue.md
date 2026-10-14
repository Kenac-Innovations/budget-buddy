# T10 · Kenac catalogue from its partners, with official product images

**Branch:** `codex/T10-kenac-catalogue` · Read `AGENTS.md`, `docs/decisions.md` (D2, D4), `docs/price-list-format.md`, `docs/codex/T4-kenac-pricing.md`, `docs/codex/reports/T4.md`, `docs/codex/T9-plan-hud.md` and `docs/codex/reports/T9.md` first.

## Goal
Give Budget Buddy a real **Kenac catalogue**: the product families Kenac can supply through its vendor partnerships, with **official product images**, so the plan panel shows real products when something fits. There are **no prices yet**; Kenac will send its price list later.

## What Kenac sells (from https://www.kenac.co.zw/ and /partnership.html, 14 Oct 2026)
Partners: **IBM (Gold Partner), Dell, HP, Lenovo, Cisco, Fortinet, Check Point, F5, BeyondTrust, Microsoft, Red Hat, VMware, Veeam, Veritas, Cloudera, Scale.**
- Kenac's IBM page names: IBM Storage (FlashSystem), Power Systems, AIX, MQ, Integration Bus / App Connect Enterprise, Cloud Pak for Business Automation, QRadar SIEM, MaaS360, Guardium, Verify.
- The other partner pages describe solution areas only: Lenovo devices, peripherals and data centre; Fortinet Security Fabric (secure networking, zero trust, SOC, cloud security); Cisco security, collaboration, data centre, IoT and wireless.
- Sectors: mining, financial services, government, retail.

## You own
- `catalogue/kenac/**` (new: `products.csv`, `images.json` provenance manifest, `README.md`);
- `public/catalogue/kenac/**` (downloaded images);
- `src/lib/pricing/**` and `scripts/import-price-list.ts`, but only to support catalogue items **without a price**;
- `docs/price-list-format.md`;
- `src/lib/advisor/fixtures.ts` (the HUD demo script only).

## Don't change
The contracts (`src/lib/plan/*`, `events.ts`, `session/store.ts`), the evidence policy or the engine. **An item with no price stays unpriced.** Never invent or estimate prices.

## Build

1. **Catalogue (`catalogue/kenac/products.csv`)**, about 30–40 **product families**, not every model. Use the existing price-list format with an empty `price`, `currency` and `valid_until`. The `sku` is a stable family id (e.g. `FORTINET-FORTIGATE-SMB`). Cover what a CIO, CTO or CSO budgets for:
   - **End-user devices:** Lenovo ThinkPad (mainstream T-series and premium X1), ThinkCentre desktops; Dell Latitude and OptiPlex; HP EliteBook and ProBook; monitors and docks.
   - **Servers and storage:** Lenovo ThinkSystem rack servers; Dell PowerEdge; IBM Power Systems; IBM FlashSystem storage; Scale Computing hyperconverged appliances.
   - **Networking:** Cisco Catalyst switches, Cisco Meraki (switches, access points, MX), Cisco wireless access points; F5 BIG-IP (application delivery).
   - **Security:** Fortinet FortiGate (branch/SMB and enterprise), FortiSwitch, FortiAP, FortiAnalyzer; Check Point Quantum gateways; BeyondTrust privileged access; IBM QRadar SIEM, Guardium, Verify, MaaS360.
   - **Software and licences:** Microsoft 365 business plans; Red Hat Enterprise Linux; VMware vSphere (note the subscription licensing change in the description); IBM MQ and App Connect.
   - **Backup and recovery:** Veeam Data Platform; Veritas NetBackup.
   - **Data and analytics:** Cloudera Data Platform.

   **Attributes** (used for fit matching; family-level and factual only, taken from the vendor's own pages):
   - `form_factor`, `segment` (smb/midmarket/enterprise), `use_case`;
   - plus category-specific attributes where the vendor states them: e.g. `max_users_band`, `throughput_class`, `ports_class`, `cpu_class`, `ram_gb_min`, `deployment` (appliance/vm/cloud), `licence_model` (perpetual/subscription).

   Map each family to Budget Buddy's categories (Hardware, Servers and storage, Networking, Cybersecurity, Software and subscriptions, Backup and recovery, Data and analytics) and to the T9 illustration set as a fallback.
2. **Official product images (`public/catalogue/kenac/<vendor>/<sku>.<ext>`)**
   - **Sources allowed:** the manufacturer's official domains (lenovo.com, psref.lenovo.com, dell.com, hp.com, cisco.com, meraki.cisco.com, fortinet.com, checkpoint.com, f5.com, ibm.com, scalecomputing.com, and the vendors' official media or press-kit pages) **or** kenac.co.zw. Kenac is an authorised partner of these vendors, and the product owner has confirmed Kenac may use their product imagery.
   - **Not allowed:** retailer or marketplace sites, image search results, logos or wordmarks used as product photos, or images showing people.
   - Prefer the vendor's product-page hero or `og:image`, or the PSREF product image for Lenovo. One image per family, and prefer a clean product shot on a plain background.
   - Download with `curl` and keep the original format (jpg, png or webp). Reject anything over 1.5 MB or under 400px wide.
   - **Software products** (Microsoft 365, RHEL, vSphere, Veeam, NetBackup, MQ, Cloudera, QRadar…): only use an official product-UI screenshot or product visual from the vendor's own page. If there isn't a clean one, leave `image_url` empty, so the UI uses the T9 category illustration. Never use a logo as the picture.
   - **`catalogue/kenac/images.json`:** for every image, record `{sku, file, source_page_url, image_url, downloaded_at, vendor, licence_note:"Manufacturer marketing image, used by Kenac as authorised partner"}`.
3. **Unpriced catalogue items through the pipeline**
   - The import accepts rows with an empty price; `CatalogueItem.price` is already nullable. Check this.
   - `find_kenac_price` returns unpriced fitting families as offers with `usablePrice: null`, "Available through Kenac · price on request", and the product's `{sku, name, imageUrl}`.
   - **The advisor never attaches a price for these.** Instead, the line shows the Kenac product and stays Unpriced.
   - **Product without a price:** the `LinePrice.product` field only exists on a price, so for unpriced Kenac matches add a **display-only** association. Add an optional `catalogueSku` to the line via a new user/advisor op? **No**, that's a contract change. Instead, keep the match in the advisor's reply ("Kenac can supply FortiGate; ask for a quote"), and show the product image on the line card when the line title or category matches a catalogue family through a **pure UI lookup** (`src/lib/pricing/catalogue-display.ts`, which reads the imported catalogue once; read-only). Label it "Kenac can supply · price on request".
4. **Fix the HUD demo (`fixtures.ts`)** so it's honest about what Kenac sells:
   - **Solar and UPS:** **not** Kenac-priced (Kenac has no power partner). Keep it unpriced with the illustration, and have the advisor text say quotes are needed from power suppliers.
   - **Add Kenac-relevant lines:** branch firewalls (FortiGate SMB family image, "Kenac can supply · price on request"), laptops for new branch staff (ThinkPad family image), branch switching and Wi-Fi (Meraki or Catalyst image).
   - Any demo prices stay labelled "Demo price list · not real prices". Prefer leaving the Kenac families unpriced in the demo, so the "price on request" state is visible.
5. **Import the catalogue locally** in the in-memory demo path, so demo mode shows the images without Postgres.

## Acceptance criteria
- [ ] `catalogue/kenac/products.csv` has ≥30 families across the categories above, all unpriced, with factual attributes and descriptions sourced from vendor pages.
- [ ] Every image in `public/catalogue/kenac/**` has a provenance entry. All sources are on the allowed domains. No logos, retailer images or people.
- [ ] The import accepts unpriced rows. `find_kenac_price` returns unpriced fitting families with product info and never a usable price. Tests cover both.
- [ ] In the HUD demo: solar is unpriced and not Kenac; the firewall, laptop and switching lines show official product images with "Kenac can supply · price on request". The total doesn't count them.
- [ ] `pnpm test`, `pnpm test:evals`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
- [ ] The report includes a contact sheet (one page listing every image with its family name) and notes any family left without an image, and why.
