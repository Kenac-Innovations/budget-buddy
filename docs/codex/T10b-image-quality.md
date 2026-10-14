# T10b · Kenac catalogue image quality pass

**Branch:** `codex/T10b-image-quality` · Read `AGENTS.md`, `docs/codex/T10-kenac-catalogue.md`, `docs/codex/T9-visual-references.md`, `docs/codex/reports/T10.md`, and look at `catalogue/kenac/contact-sheet.png`.

## Goal
Make the catalogue images read as **one curated set** (Ubiquiti store standard): a clean product shot of the physical product, on a plain light background, filling the frame consistently. The integrator reviewed the contact sheet and found five images below that bar.

## Fix these
| SKU | Problem | Wanted |
|---|---|---|
| FORTINET-FORTISWITCH | Shows a management UI on a laptop; this is a physical switch | Official FortiSwitch hardware photo (front or three-quarter) |
| FORTINET-FORTIAP | Shows a management UI on a laptop; this is a physical access point | Official FortiAP hardware photo |
| HP-PROBOOK | The product is tiny inside a large canvas | A larger official ProBook product shot, or trim the transparent or white margins so the device fills about 80% of the frame |
| IBM-FLASHSYSTEM | A wide banner, not a product shot | Official FlashSystem enclosure product photo |
| SCALE-HYPERCONVERGED | A software screenshot; Scale sells hardware appliances | Official Scale Computing appliance (HyperCore node) photo |

For the software families (FortiAnalyzer, QRadar, Red Hat Enterprise Linux), product screenshots are acceptable. Make sure the line cards frame them consistently (same stage, `object-fit: contain`).

## Rules (unchanged from T10)
- **Sources:** manufacturer official domains only (fortinet.com, hp.com, ibm.com, scalecomputing.com, and their official media or press pages). No retailers, image search, logos or people.
- Update `catalogue/kenac/images.json` provenance for every replaced image (source page, image URL, download date, licence note), replace the files under `public/catalogue/kenac/`, and regenerate `catalogue/kenac/contact-sheet.png`.
- **Margins:** you may trim plain white or transparent margins (no new dependencies; macOS `sips` or a small script using what's already installed is fine). Never alter the product itself.
- If no suitable official photo exists for a family, say so in the report and leave the current image. Don't substitute a non-official one.

## You own
`public/catalogue/kenac/**`, `catalogue/kenac/**`, `docs/codex/reports/T10b.md`.

## Done when
- [ ] The five families have official hardware product shots (or a documented reason).
- [ ] The regenerated contact sheet looks like one curated set.
- [ ] Provenance is complete for every replaced image.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` pass.
