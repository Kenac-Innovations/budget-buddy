# Kenac supply catalogue

39 product families across seven planning categories, verified against the manufacturer's pages linked in `sources.json`. Kenac's partner scope comes from [its partnership page](https://www.kenac.co.zw/partnership.html) and the T10 owner brief dated 14 October 2026. Families describe supply capabilities, not stock, model-level fit or a commercial price list. Confirm the exact model and entitlement before procurement.

- `products.csv`: canonical import snapshot, all price/currency/validity fields blank.
- `products.json`: identical parsed snapshot for the demo and read-only browser lookup. Tests enforce CSV parity.
- `sources.json`: one source page per family, description and attribute limitations.
- `images.json`: provenance for every local image, with manufacturer page, download URL, timestamp and partner-use licence note.
- `contact-sheet.png`: all local images with family names on one page; reviewed visually for people, logos used as photos and retailer content.

The 23 local files use the manufacturer's JPEG, PNG or WebP format. Lenovo's PSREF URLs end in `.png` but respond with JPEG; the local `.jpg` extension reflects the actual response. Each file is below 1.5 MB and at least 400 pixels wide. Images preserve downloaded bytes except the margin-only crops recorded in `images.json`; crop coordinates use Pillow's left/top/right/bottom convention (right and bottom excluded), with the original member/file hash and dimensions retained. No product is resized or retouched in the stored assets.

T10b replaces the FortiSwitch and FortiAP laptop screenshots with hardware photographs from [Fortinet's official press kit](https://www.fortinet.com/corporate/about-us/newsroom/press-kit); `archive_member` identifies the original file inside each ZIP download. The ProBook's transparent side margins are trimmed so the device spans 80% of its 468-pixel canvas. FlashSystem uses IBM's single 5600 enclosure on a plain light-grey background, and Scale uses the official HE150 appliance photo. Scale's new PNG path is reflected in both catalogue snapshots. FortiAnalyzer, QRadar and RHEL retain their permitted software visuals. These are representative family visuals, not promises about the hardware model being quoted.

Regenerate the contact sheet with `python3 catalogue/kenac/render_contact_sheet.py` (uses the already available Pillow installation). It checks file hashes, dimensions, formats and byte limits before rendering all 23 images with the same square contain stage and 10% padding used by line cards. Preview resizing and compositing never change the source assets. The application retains its shared contain framing for both hardware and software in light and dark mode.

Descriptions and attributes are deliberately conservative. `form_factor` and `use_case` describe family purpose. `segment` is supplied only where the vendor expressly distinguishes SMB or enterprise; an absent segment is unknown, not a restriction. Unstated CPU, RAM, throughput, port counts, licences and user bands remain absent and produce an unconfirmed constraint result. Microsoft 365's business user band and the VMware subscription transition are documented in their official sources. No prices were taken from vendor pages.

Fallbacks use the existing T9 illustration set: Hardware → hardware; Servers and storage → servers; Networking → networking; Cybersecurity and Backup and recovery → cybersecurity; Software and subscriptions and Data and analytics → software. A missing image never becomes a logo.

## Families without a local image

| Family | Reason |
| --- | --- |
| Lenovo ThinkPad docks | No suitable clean image retained from the PSREF accessory page. |
| IBM Power Systems | No suitable single representative clean image retained from the dynamic family page. |
| Cisco Meraki access points | No suitable clean image retained from the dynamic product catalogue. |
| Cisco Meraki MX | No suitable clean family image retained from the official datasheet. |
| F5 BIG-IP | Multiple hardware/virtual deployments; no suitable clean representative visual retained. |
| BeyondTrust privileged access | No clean official product UI visual retained; decorative imagery and logos excluded. |
| IBM Guardium Data Protection | No clean product UI visual retained from its family page. |
| IBM Verify | No clean product UI visual retained from its family page. |
| IBM MaaS360 | No clean product UI visual retained from its family page. |
| Microsoft 365 business plans | No clean representative product UI visual retained; logos excluded. |
| VMware vSphere | Dynamic family page; no clean product UI visual retained. |
| IBM MQ | No clean product UI visual retained; architecture/brand graphics excluded. |
| IBM App Connect Enterprise | No clean product UI visual retained for the specific Enterprise family. |
| Veeam Data Platform | No clean product UI visual retained for the platform family. |
| Veritas NetBackup | Official Veritas URL redirects to Cohesity; supply channel needs confirmation, no imagery retained. |
| Cloudera Data Platform | No clean product UI visual retained from its family page. |

These use category illustrations. They remain valid unpriced catalogue entries. Adding future images requires the same source, format, dimensions, size and visual checks plus a provenance entry.

See [the import format](../../docs/price-list-format.md) for the database import command and demo configuration. The runtime reader never needs a database in demo mode. The browser lookup is display-only and cannot attach a price or change the budget.
