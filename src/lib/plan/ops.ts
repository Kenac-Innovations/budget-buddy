import { z } from "zod";
import { checkPriceEvidence } from "@/lib/sourcing/evidence";
import {
  Disposition,
  Frequency,
  ItemState,
  LinePrice,
  Plan,
  PriceBasis,
  Profile,
  Source,
  type Actor,
} from "./types";

/**
 * Plan operations: the only way the plan changes. The advisor's tools map one-to-one onto the
 * advisor-allowed ops; the UI sends the user-only ops (accept, dismiss, share). The reducer assigns
 * ids so the model never invents them, and enforces the price-evidence policy.
 */

const id = z.string().min(1).max(12);

export const PlanOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_profile"), profile: Profile.partial() }),
  z.object({
    op: z.literal("add_objective"),
    title: z.string().min(1).max(160),
    measure: z.string().max(200).optional(),
  }),
  z.object({
    op: z.literal("update_objective"),
    id,
    title: z.string().min(1).max(160).optional(),
    measure: z.string().max(200).optional(),
  }),
  z.object({
    op: z.literal("add_initiative"),
    objectiveId: id,
    title: z.string().min(1).max(160),
    disposition: Disposition,
    rationale: z.string().max(600),
    caution: z.string().max(400).optional(),
    proactive: z.boolean().optional(),
    sources: z.array(Source).max(6).optional(),
  }),
  z.object({
    op: z.literal("update_initiative"),
    id,
    title: z.string().min(1).max(160).optional(),
    disposition: Disposition.optional(),
    rationale: z.string().max(600).optional(),
    caution: z.string().max(400).optional(),
  }),
  z.object({
    op: z.literal("add_line"),
    initiativeId: id.nullable(),
    title: z.string().min(1).max(160),
    category: z.string().max(60),
    quantity: z.number().positive().nullable(),
    unit: z.string().max(30).optional(),
    priceBasis: PriceBasis.optional(),
    frequency: Frequency,
    paymentMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    forgottenCost: z.boolean().optional(),
    note: z.string().max(300).optional(),
  }),
  z.object({
    op: z.literal("update_line"),
    id,
    title: z.string().min(1).max(160).optional(),
    quantity: z.number().positive().nullable().optional(),
    frequency: Frequency.optional(),
    paymentMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
    note: z.string().max(300).optional(),
  }),
  /** Attach a sourced price. AI may only cite documented evidence (never USER_ESTIMATE). */
  z.object({ op: z.literal("price_line"), id, price: LinePrice }),
  z.object({ op: z.literal("clear_price"), id }),
  /** User only. */
  z.object({
    op: z.literal("set_state"),
    id,
    state: ItemState,
    reason: z.string().max(300).optional(),
  }),
  /** User only (journey stage 7). */
  z.object({
    op: z.literal("set_sharing"),
    id,
    shared: z.boolean(),
    shareAllocation: z.boolean().optional(),
  }),
]);
export type PlanOp = z.infer<typeof PlanOp>;

const USER_ONLY: ReadonlySet<PlanOp["op"]> = new Set(["set_state", "set_sharing"]);

export type OpResult =
  | { ok: true; plan: Plan; createdId?: string }
  | { ok: false; error: string };

export function applyOp(plan: Plan, op: PlanOp, actor: Actor, asOf: Date = new Date()): OpResult {
  if (actor === "advisor" && USER_ONLY.has(op.op)) {
    return { ok: false, error: `Only the user can ${op.op === "set_state" ? "accept or dismiss items" : "change sharing"}.` };
  }
  const next: Plan = structuredClone(plan);
  const fail = (error: string): OpResult => ({ ok: false, error });
  const newId = (prefix: string) => `${prefix}${next.nextId++}`;
  const proposed = actor === "advisor" ? "proposed" : "accepted";

  switch (op.op) {
    case "set_profile":
      next.profile = { ...next.profile, ...op.profile };
      break;

    case "add_objective": {
      const created = newId("o");
      next.objectives.push({ id: created, title: op.title, measure: op.measure, state: proposed, createdBy: actor });
      return done(next, created);
    }

    case "update_objective": {
      const o = next.objectives.find((x) => x.id === op.id);
      if (!o) return fail(`No objective ${op.id}.`);
      if (op.title !== undefined) o.title = op.title;
      if (op.measure !== undefined) o.measure = op.measure;
      break;
    }

    case "add_initiative": {
      if (!next.objectives.some((o) => o.id === op.objectiveId && o.state !== "dismissed")) {
        return fail(`No active objective ${op.objectiveId}.`);
      }
      const created = newId("i");
      next.initiatives.push({
        id: created,
        objectiveId: op.objectiveId,
        title: op.title,
        disposition: op.disposition,
        rationale: op.rationale,
        caution: op.caution,
        proactive: op.proactive ?? false,
        sources: op.sources ?? [],
        state: proposed,
        createdBy: actor,
      });
      return done(next, created);
    }

    case "update_initiative": {
      const i = next.initiatives.find((x) => x.id === op.id);
      if (!i) return fail(`No initiative ${op.id}.`);
      if (op.title !== undefined) i.title = op.title;
      if (op.disposition !== undefined) i.disposition = op.disposition;
      if (op.rationale !== undefined) i.rationale = op.rationale;
      if (op.caution !== undefined) i.caution = op.caution;
      break;
    }

    case "add_line": {
      if (op.initiativeId !== null && !next.initiatives.some((i) => i.id === op.initiativeId)) {
        return fail(`No initiative ${op.initiativeId}.`);
      }
      const created = newId("l");
      next.lines.push({
        id: created,
        initiativeId: op.initiativeId,
        title: op.title,
        category: op.category,
        quantity: op.quantity,
        unit: op.unit,
        priceBasis: op.priceBasis ?? "per_unit",
        frequency: op.frequency,
        paymentMonth: op.paymentMonth,
        forgottenCost: op.forgottenCost ?? false,
        price: null,
        note: op.note,
        sharedWithKenac: false,
        shareAllocation: false,
        state: proposed,
        createdBy: actor,
      });
      return done(next, created);
    }

    case "update_line": {
      const l = next.lines.find((x) => x.id === op.id);
      if (!l) return fail(`No line ${op.id}.`);
      if (op.title !== undefined) l.title = op.title;
      if (op.quantity !== undefined) l.quantity = op.quantity;
      if (op.frequency !== undefined) l.frequency = op.frequency;
      if (op.paymentMonth !== undefined) l.paymentMonth = op.paymentMonth;
      if (op.note !== undefined) l.note = op.note;
      break;
    }

    case "price_line": {
      const l = next.lines.find((x) => x.id === op.id);
      if (!l) return fail(`No line ${op.id}.`);
      const { evidence } = op.price;
      const check = checkPriceEvidence(
        {
          type: evidence.type,
          amount: op.price.unitPrice,
          currency: op.price.currency,
          reference: evidence.reference,
          capturedAt: new Date(evidence.capturedAt),
          validUntil: evidence.validUntil ? new Date(evidence.validUntil) : null,
        },
        actor === "advisor" ? "AI_SUGGESTION" : "USER",
        op.price.currency,
        asOf,
      );
      if (!check.ok) return fail(`Price rejected: ${check.reason}. Leave the line unpriced or cite documented evidence.`);
      l.price = op.price;
      break;
    }

    case "clear_price": {
      const l = next.lines.find((x) => x.id === op.id);
      if (!l) return fail(`No line ${op.id}.`);
      l.price = null;
      break;
    }

    case "set_state": {
      const item =
        next.objectives.find((x) => x.id === op.id) ??
        next.initiatives.find((x) => x.id === op.id) ??
        next.lines.find((x) => x.id === op.id);
      if (!item) return fail(`No item ${op.id}.`);
      item.state = op.state;
      // Initiatives remember why they were set aside, so the advisor doesn't propose them again.
      if ("rationale" in item) item.dismissReason = op.state === "dismissed" ? op.reason : undefined;
      break;
    }

    case "set_sharing": {
      const l = next.lines.find((x) => x.id === op.id);
      if (!l) return fail(`No line ${op.id}.`);
      l.sharedWithKenac = op.shared;
      l.shareAllocation = op.shared ? (op.shareAllocation ?? false) : false;
      break;
    }
  }
  return done(next);
}

function done(plan: Plan, createdId?: string): OpResult {
  plan.version += 1;
  return { ok: true, plan: Plan.parse(plan), createdId };
}
