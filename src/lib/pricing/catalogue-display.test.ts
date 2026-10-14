import { expect, it } from "vitest";
import { catalogueDisplay, catalogueIllustration } from "./catalogue-display";

it("associates unpriced intent with representative families without changing the line", () => {
  for (const [title, category, sku] of [
    ["Branch firewalls", "Cybersecurity", "FORTINET-FORTIGATE-SMB"],
    ["Laptops for new branch staff", "Hardware", "LENOVO-THINKPAD-T"],
    ["Branch switching and Wi-Fi", "Networking", "CISCO-MERAKI-MS"],
    ["Cisco Catalyst switches", "Networking", "CISCO-CATALYST"],
    ["ThinkPad X1 for leadership", "Hardware", "LENOVO-THINKPAD-X1"],
    ["Latitude 5450 laptops", "Hardware", "DELL-LATITUDE"],
  ]) {
    const line = Object.freeze({ title, category, price: null });
    expect(catalogueDisplay(line)).toMatchObject({ sku, imageUrl: expect.stringMatching(/^\/catalogue\/kenac\//),
      label: "Kenac can supply · price on request" });
    expect(line.price).toBeNull();
  }
});
it("does not guess from a broad category, renewal, services, power or an existing estimate", () => {
  for (const [title, category] of [["Solar and UPS", "Power"], ["Firewall subscription renewal", "Cybersecurity"],
    ["Installation of laptops", "Professional services"], ["Business infrastructure", "Networking"], ["Endpoint management", "Hardware"], ["Dell laptops", "Hardware"], ["Enterprise firewalls", "Cybersecurity"]]) {
    expect(catalogueDisplay({ title, category, price: null })).toBeNull();
  }
  expect(catalogueDisplay({ title: "Branch laptops", category: "Hardware", price: {
    unitPrice: "100", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "Own estimate", capturedAt: "2026-10-14" },
  } })).toBeNull();
});
it("maps all catalogue categories to existing T9 fallback artwork", () => {
  for (const category of ["Hardware", "Servers and storage", "Networking", "Cybersecurity", "Software and subscriptions", "Backup and recovery", "Data and analytics"]) {
    expect(catalogueIllustration(category)).toMatch(/^\/illustrations\/categories\/(hardware|servers|networking|cybersecurity|software)\.svg$/);
  }
});
