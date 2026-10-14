# T9 · Visual references (added mid-task by the product owner)

These are the quality bar for the plan HUD. Study what each does; don't copy their assets, logos or code.

| Reference | What to take from it |
|---|---|
| **store.ui.com** (Ubiquiti) | **The main bar for product imagery.** Infrastructure hardware (switches, APs, gateways) photographed like premium objects: consistent framing, soft neutral background, generous padding, no clutter. Our category illustrations and Kenac product images must share one framing, one background (`surface-2` / `brand-soft`) and one visual weight, so the plan looks curated, not like a pasted catalogue. Normalise image boxes (fixed aspect ratio, `object-fit: contain`, inner padding). |
| **apple.com/shop/buy-mac** (configurator) | **The bar for interaction.** Every choice instantly updates the price and the picture, with calm, precise transitions. Our Fund ↔ Defer toggles, quantity steppers and Accept must feel exactly like this: immediate visual and number response, no spinners. |
| **tesla.com** design studio | A live total that re-animates as options change, with a cinematic hero object. Apply this to the HUD total and the ring. |
| **frame.work** (Framework laptops) | Exploded views of modular parts. Use it for the detail sheet: a purchase shows its parts (device + accessories + implementation + disposal), with the forgotten costs highlighted as "Spotted". |
| **apple.com** product pages | Large visuals, whitespace, one idea per section, motion only when it explains something. |
| **sonos.com** | Dark mode done right: products lit on charcoal. Make the dark-mode HUD look intentional and premium. |
| **LG gram (Awwwards / CSS Design Awards winner)** | Proof that award-level motion can be done with **SVG + CSS animation**, matching our no-new-dependencies rule. |
| **meraki.cisco.com** | Enterprise restraint. The audience is CIOs, CTOs and CSOs: credible and calm, never consumer-flashy. When in doubt, choose restraint. |

## Concrete checks before you finish
- Put every line card visual (illustration or product image) side by side. Do they look like one curated set?
- Does every toggle and stepper update the total, ring and timeline within one frame of the click, with an eased number transition?
- Does the detail sheet show the purchase's parts as an exploded list with forgotten costs highlighted?
- Does dark mode look deliberate, with products well lit?
