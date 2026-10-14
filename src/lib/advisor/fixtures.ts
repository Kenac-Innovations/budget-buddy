import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { emptyPlan, type Plan } from "@/lib/plan/types";
import type { AdvisorEvent } from "./events";

/**
 * Scripted turns for building and testing the UI before the real advisor exists, and for demos
 * with ADVISOR_MODE=demo. Set ADVISOR_DEMO_HUD=1 for the illustrated HUD demo.
 * The original fixture stays stable for contract and Excel golden tests. Each turn is the events the server would stream.
 */

interface ScriptedTurn {
  text: string;
  ops: PlanOp[];
}

const SCRIPT: ScriptedTurn[] = [
  {
    text: "About 180 staff across a head office and four branches opening next year, with outages the board's main complaint. Clear enough. I've sketched the usual 2027 shape on the right. Is the branch timing firm, or could it slip into 2028?",
    ops: [
      { op: "set_profile", profile: { role: "CIO", sector: "Financial services", staffBand: "100–250", siteBand: "3–5" } },
      { op: "add_objective", title: "Open four branches on time", measure: "All four branches trading by Q3 2027" },
      { op: "add_objective", title: "Cut outages", measure: "Branch downtime under 4 hours a month" },
    ],
  },
  {
    text: "Then power comes before the network. Your outages are mostly load-shedding, so solar and UPS at each branch will do more than any link upgrade. SD-WAN is worth investigating once all four sites are live. And I've added your firewall renewal; it falls in August and tends to surprise people.",
    ops: [
      {
        op: "add_initiative",
        objectiveId: "o2",
        title: "Solar and UPS at every branch",
        disposition: "fund",
        rationale: "Most downtime is power, not connectivity. Backup power fixes the biggest cause first.",
        sources: [{ title: "Kenac trend brief: Power resilience", date: "2026-10", kind: "trend_brief" }],
      },
      {
        op: "add_initiative",
        objectiveId: "o1",
        title: "SD-WAN across branches",
        disposition: "investigate",
        rationale: "Simplifies managing five sites, but only pays off once the branches are live.",
        caution: "Not a fix for outages caused by power.",
      },
      {
        op: "add_line",
        initiativeId: "i3",
        title: "Solar + UPS kit, per branch",
        category: "Hardware",
        quantity: 4,
        unit: "branches",
        frequency: "one_off",
        paymentMonth: "2027-03",
      },
      {
        op: "add_line",
        initiativeId: "i3",
        title: "Installation and commissioning",
        category: "Professional services",
        quantity: 4,
        unit: "branches",
        frequency: "one_off",
        paymentMonth: "2027-03",
        forgottenCost: true,
      },
      {
        op: "add_line",
        initiativeId: null,
        title: "Firewall subscription renewal",
        category: "Cybersecurity",
        quantity: 1,
        priceBasis: "bundle",
        frequency: "annual",
        paymentMonth: "2027-08",
        note: "Carried forward. Renews every August.",
      },
    ],
  },
];

const HUD_SCRIPT: ScriptedTurn[] = [
  {
    text: "About 180 staff across a head office and four branches opening next year, with outages the board's main complaint. Clear enough. I've sketched the usual 2027 shape on the right. Is the branch timing firm, or could it slip into 2028?",
    ops: [
      { op: "set_profile", profile: { role: "CIO", sector: "Financial services", staffBand: "100–250", siteBand: "3–5" } },
      { op: "add_objective", title: "Open four branches on time", measure: "All four branches trading by Q3 2027" },
      { op: "add_objective", title: "Cut outages", measure: "Branch downtime under 4 hours a month" },
    ],
  },
  {
    text: "Demo planning data, with illustrative prices only. Then power comes before the network. Your outages are mostly load-shedding, so solar and UPS at each branch will do more than any link upgrade. SD-WAN is worth investigating once all four sites are live. And I've added your firewall renewal; it falls in August and tends to surprise people.",
    ops: [
      {
        op: "add_initiative",
        objectiveId: "o2",
        title: "Solar and UPS at every branch",
        disposition: "fund",
        rationale: "Most downtime is power, not connectivity. Backup power fixes the biggest cause first.",
        proactive: true,
        sources: [{ title: "Kenac trend brief: Power resilience", date: "2026-10", kind: "trend_brief" }],
      },
      {
        op: "add_initiative",
        objectiveId: "o1",
        title: "SD-WAN across branches",
        disposition: "investigate",
        rationale: "Simplifies managing five sites, but only pays off once the branches are live.",
        caution: "Not a fix for outages caused by power.",
      },
      {
        op: "add_line",
        initiativeId: "i3",
        title: "Solar + UPS kit, per branch",
        category: "Power",
        quantity: 4,
        unit: "branches",
        frequency: "one_off",
        paymentMonth: "2027-03",
      },
      {
        op: "add_line",
        initiativeId: "i3",
        title: "Installation and commissioning",
        category: "Professional services",
        quantity: 4,
        unit: "branches",
        frequency: "one_off",
        paymentMonth: "2027-03",
        forgottenCost: true,
      },
      {
        op: "price_line", id: "l5", price: {
          unitPrice: "4200.00", currency: "USD",
          evidence: { type: "OPERATOR_PRICE_LIST", reference: "Demo price list · not real prices", capturedAt: "2026-10-14", validUntil: "2027-12-31",
            supplier: { name: "Kenac Computer Systems", isOperator: true } },
          product: { sku: "DEMO-POWER", name: "Generic branch solar and UPS kit", imageUrl: "/catalogue/demo/solar-ups.svg" },
        },
      },
      { op: "add_line", initiativeId: "i4", title: "Branch connectivity service", category: "Connectivity", quantity: 4,
        unit: "sites", frequency: "monthly", paymentMonth: "2027-06", note: "Demo scope: service for four branches; confirm bandwidth and failover." },
      { op: "price_line", id: "l7", price: { unitPrice: "180.00", currency: "USD", evidence: {
        type: "OPERATOR_PRICE_LIST", reference: "Demo price list · not real prices", capturedAt: "2026-10-14", validUntil: "2027-12-31",
        supplier: { name: "Kenac Computer Systems", isOperator: true } } } },
      { op: "add_line", initiativeId: "i3", title: "Branch power handover training", category: "Training", quantity: 4,
        unit: "sessions", frequency: "one_off", paymentMonth: "2027-04", forgottenCost: true },
      { op: "price_line", id: "l8", price: { unitPrice: "150.00", currency: "USD", evidence: {
        type: "OPERATOR_PRICE_LIST", reference: "Demo price list · not real prices", capturedAt: "2026-10-14", validUntil: "2027-12-31",
        supplier: { name: "Kenac Computer Systems", isOperator: true } } } },
      {
        op: "add_line",
        initiativeId: null,
        title: "Firewall subscription renewal",
        category: "Cybersecurity",
        quantity: 1,
        priceBasis: "bundle",
        frequency: "annual",
        paymentMonth: "2027-08",
        note: "Carried forward. Renews every August.",
      },
    ],
  },
];


export function scriptedTurn(index: number, plan: Plan = emptyPlan(), hud = process.env.ADVISOR_DEMO_HUD === "1"): { events: AdvisorEvent[]; plan: Plan } {
  const script = hud ? HUD_SCRIPT : SCRIPT;
  const turn = script[Math.min(index, script.length - 1)];
  const events: AdvisorEvent[] = [{ type: "status", status: "thinking" }];
  let current = plan;
  for (const op of turn.ops) {
    const r = applyOp(current, op, "advisor");
    if (!r.ok) continue;
    current = r.plan;
    events.push({ type: "op", op, createdId: r.createdId, version: current.version });
  }
  for (const word of turn.text.split(/(?<= )/)) events.push({ type: "text", delta: word });
  events.push({ type: "done", plan: current });
  return { events, plan: current };
}
