import { describe, expect, it } from "vitest";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import type { Plan } from "@/lib/plan/types";
import type { ContactDetails } from "@/lib/session/store";
import { exportDemoPlan } from "./fixtures";
import { sharedRows, sharingCsv, sharedRowValues } from "./sharing";

export const demoContact: ContactDetails = { name: "Demo CIO", email: "cio@example.test", organisation: "Private organisation", role: "CIO", consentEmail: true, consentContact: false };
function op(plan: Plan, change: PlanOp) {
  const r = applyOp(plan, change, "user");
  if (!r.ok) throw new Error(r.error);
  return r.plan;
}
describe("consent projection", () => {
  it("shares exactly allowed fields, omitting private contact, allocation and unrelated plan content", () => {
    let plan = op(exportDemoPlan(), { op: "set_sharing", id: "l5", shared: true });
    plan = op(plan, { op: "set_sharing", id: "l6", shared: true, shareAllocation: true });
    const rows = sharedRows(plan, demoContact);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ lineId: "l5", item: "Solar + UPS kit, per branch", quantity: 4, unit: "branches", timing: "2027-03", frequency: "one_off", category: "Hardware", notes: null, sharedAt: null });
    expect(rows[1].allocation).toEqual({ amount: null, currency: "USD", status: "Unpriced" });
    const csv = sharingCsv(rows);
    expect(csv).not.toContain("Private organisation");
    expect(csv).not.toContain("cio@example");
    expect(csv).not.toContain("48000");
    expect(csv).not.toContain("Firewall");
    expect(csv).not.toContain("objectives");
  });
  it("includes contact and period allocation only with separate explicit consents", () => {
    const plan = op(exportDemoPlan(), { op: "set_sharing", id: "l5", shared: true, shareAllocation: true });
    const rows = sharedRows(plan, { ...demoContact, consentContact: true }, { l5: "2026-10-14T12:00:00.000Z" });
    expect(rows[0].contact).toEqual({ name: demoContact.name, email: demoContact.email, role: demoContact.role });
    expect(rows[0].allocation).toEqual({ amount: "48000.50", currency: "USD", status: "Priced" });
    expect(sharedRowValues(rows[0])).toContain(demoContact.organisation);
    expect(sharingCsv(rows)).toContain("48000.50");
  });
  it("removes unshared, proposed and dismissed lines regardless of saved sharing flags", () => {
    let plan = op(exportDemoPlan(), { op: "set_sharing", id: "l5", shared: true });
    plan = op(plan, { op: "set_state", id: "l5", state: "proposed" });
    expect(sharedRows(plan, demoContact)).toEqual([]);
    plan = op(plan, { op: "set_state", id: "l5", state: "dismissed" });
    expect(sharedRows(plan, demoContact)).toEqual([]);
    plan = op(plan, { op: "set_sharing", id: "l5", shared: false });
    expect(sharedRows(plan, demoContact)).toEqual([]);
  });
  it("escapes formula injection, quotes, newlines and markup in CSV", () => {
    let plan = op(exportDemoPlan(), { op: "update_line", id: "l5", title: '=HYPERLINK("bad")', note: "\t=1+1\n<script>" });
    plan = op(plan, { op: "set_sharing", id: "l5", shared: true });
    expect(sharingCsv(sharedRows(plan, demoContact))).toContain('"\'=HYPERLINK(""bad"")"');
    expect(sharingCsv(sharedRows(plan, demoContact))).toContain('"\'\t=1+1\n<script>"');
  });
});
