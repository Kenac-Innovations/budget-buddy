import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { emptyPlan, type Plan } from "@/lib/plan/types";
import type { AdvisorEvent } from "./events";

/**
 * Scripted turns for building and testing the UI before the real advisor exists, and for demos
 * with ADVISOR_MODE=demo. Each turn is the events the server would stream.
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

export function scriptedTurn(index: number, plan: Plan = emptyPlan()): { events: AdvisorEvent[]; plan: Plan } {
  const turn = SCRIPT[Math.min(index, SCRIPT.length - 1)];
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
