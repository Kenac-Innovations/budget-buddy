import { describe, expect, it } from "vitest";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { runDemo } from "@/lib/advisor/demo";
import { InMemorySessionStore } from "@/lib/session/store";
import type { AdvisorEvent } from "@/lib/advisor/events";
import { planTotals } from "@/lib/plan/totals";
import type { Plan } from "@/lib/plan/types";
import { catalogueDisplay } from "@/lib/pricing/catalogue-display";
import { categoryIllustration, deriveHud, pathIds, quoteRequest } from "./derive";

function change(plan: Plan, op: PlanOp) {
  const result = applyOp(plan, op, "user");
  if (!result.ok) throw new Error(result.error);
  return result.plan;
}
function demo() { return scriptedTurn(1, scriptedTurn(0, undefined, true).plan, true).plan; }
function acceptLines(plan: Plan) {
  return plan.lines.reduce((p, l) => change(p, { op: "set_state", id: l.id, state: "accepted" }), plan);
}
describe("HUD engine selections", () => {
  it("keeps proposals out of spend, previews card totals and leaves missing prices unknown", () => {
    const hud = deriveHud(demo());
    expect(hud.totals.lines).toHaveLength(0);
    expect(hud.unpriced).toBe(6);
    expect(hud.lineTotals.get("l5")?.total).toBeNull();
    expect(hud.lineTotals.get("l6")?.total).toBeNull();
  });
  it("defers only accepted initiatives and reconciles category, objective and monthly engine selections", () => {
    let plan = acceptLines(demo());
    const before = structuredClone(plan);
    expect(deriveHud(plan).totals.reportingTotal.toString()).toBe("5640");
    plan = change(plan, { op: "update_initiative", id: "i3", disposition: "defer" });
    expect(deriveHud(plan).savings.toString()).toBe("0");
    plan = change(plan, { op: "set_state", id: "i3", state: "accepted" });
    const hud = deriveHud(plan);
    expect(hud.savings.toString()).toBe("600");
    expect(hud.totals.reportingTotal.toString()).toBe("5040");
    expect(hud.totals.reportingMonthly.get("2027-03")?.toString()).toBe("0");
    expect(hud.totals.reportingMonthly.get("2027-06")?.toString()).toBe("720");
    expect(hud.categories.find(c => c.category === "Power")?.total.toString()).toBe("0");
    expect(hud.objectives.get("o2")?.toString()).toBe("0");
    expect(hud.objectives.get("o1")?.toString()).toBe("5040");
    expect(before.lines).toEqual(plan.lines);
    expect(planTotals(before).reportingTotal.toString()).toBe("5640");
    expect(plan.lines).toHaveLength(8); // Filtering never edits persisted plan JSON.
    plan = change(plan, { op: "update_initiative", id: "i3", disposition: "fund" });
    expect(deriveHud(plan).totals.reportingTotal.toString()).toBe("5640");
  });
  it("respects custom periods, unknown quantities, unconverted money and bundle pricing", () => {
    let plan = acceptLines(demo());
    plan = change(plan, { op: "set_profile", profile: { periodStart: "2027-03", periodEnd: "2027-08" } });
    plan = change(plan, { op: "update_line", id: "l5", quantity: null });
    plan = change(plan, { op: "price_line", id: "l8", price: { unitPrice: "123.45", currency: "ZAR", evidence: {
      type: "USER_ESTIMATE", reference: "Own estimate", capturedAt: "2026-10-14" } } });
    const hud = deriveHud(plan);
    expect(hud.totals.months).toHaveLength(6);
    expect(hud.totals.unpricedLineIds).toContain("l5");
    expect(hud.totals.unconvertedLineIds).toContain("l8");
    expect(hud.complete).toBe(false);
    expect(hud.totals.reportingTotal.toString()).toBe("2160");
  });
  it("identifies ancestors and descendants without lighting sibling initiatives", () => {
    const plan = demo();
    expect([...pathIds(plan, "l5")]).toEqual(expect.arrayContaining(["l5", "i3", "o2"]));
    expect(pathIds(plan, "l5").has("l6")).toBe(false);
    expect(pathIds(plan, "o2").has("l8")).toBe(true);
    expect(pathIds(plan, "o2").has("l7")).toBe(false);
  });
  it("maps all category illustrations and produces a vendor-neutral request without private allocations", () => {
    for (const category of ["Servers", "Networking", "Connectivity", "Power", "Cybersecurity", "Cloud", "Software", "Licences", "Professional services", "Training", "Support", "Unknown"])
      expect(categoryIllustration(category)).toMatch(/^\/illustrations\/categories\/[a-z]+\.svg$/);
    const request = quoteRequest(demo().lines[0], "2027-01");
    expect(request).toContain("Quantity: 4 branches");
    expect(request).toContain("Mar 2027");
    expect(request).not.toContain("Kenac");
    expect(request).not.toContain("4200");
  });
  it("streams the rich demo through memory persistence, keeping supply imagery display-only and creating all lines during text", async () => {
    const store = new InMemorySessionStore();
    let session = await store.create();
    const original = process.env.ADVISOR_DEMO_HUD;
    process.env.ADVISOR_DEMO_HUD = "1";
    try {
      for (const message of ["180 staff, four branches", "Mostly power"]) {
        const events: AdvisorEvent[] = [];
        await runDemo({ store, session, message, emit: e => events.push(e), wordDelayMs: 0, opDelayMs: 0 });
        expect(events.some(e => e.type === "error")).toBe(false);
        const lastOp = events.findLastIndex(e => e.type === "op");
        expect(events.slice(lastOp + 1).some(e => e.type === "text")).toBe(true);
        session = (await store.findByToken(session.token))!;
      }
      expect(session.plan.lines).toHaveLength(8);
      expect(session.plan.lines[0].price).toBeNull();
      expect(catalogueDisplay(session.plan.lines[0])).toBeNull();
      for (const line of session.plan.lines.slice(-3)) {
        expect(line.price).toBeNull();
        expect(catalogueDisplay(line)?.imageUrl).toMatch(/^\/catalogue\/kenac\//);
      }
      expect(session.plan.lines.filter(l => l.price)).toHaveLength(2);
      expect(session.plan.initiatives.some(i => i.proactive)).toBe(true);
      expect(session.plan.lines.find(l => l.title === "Firewall subscription renewal")?.initiativeId).toBe(session.plan.initiatives.at(-1)?.id);
      expect(session.plan.lines.slice(-3).every(l => l.initiativeId === "i4")).toBe(true);
    } finally {
      if (original === undefined) delete process.env.ADVISOR_DEMO_HUD; else process.env.ADVISOR_DEMO_HUD = original;
    }
  });
});
