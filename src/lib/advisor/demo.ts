import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { applyOp } from "@/lib/plan/ops";
import { Plan } from "@/lib/plan/types";
import type { AdvisorSessionRecord, SessionStore } from "@/lib/session/store";
import { AdvisorEvent, TurnRequest } from "./events";
import { scriptedTurn } from "./fixtures";
import { readyToWrapUp, requestedWrapUp, wrapUpSummary } from "./summary";

export interface DemoOptions {
  session: AdvisorSessionRecord;
  store: SessionStore;
  message: string;
  emit: (event: AdvisorEvent) => void;
  signal?: AbortSignal;
  wordDelayMs?: number;
  opDelayMs?: number;
  timeoutMs?: number;
}

export async function runDemo(options: DemoOptions): Promise<Plan> {
  const { session, store } = options;
  const message = TurnRequest.parse({ message: options.message }).message;
  const index = session.messages.filter((m) => z.object({ role: z.literal("user") }).safeParse(m).success).length;
  let plan = Plan.parse(session.plan);
  let text = "";
  const emit = (event: AdvisorEvent) => options.emit(AdvisorEvent.parse(event));
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 60_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  let failure = false;
  try {
    let events: AdvisorEvent[];
    if (requestedWrapUp(message) || readyToWrapUp(plan)) {
      events = [{ type: "status", status: "thinking" }, { type: "wrap_up", summary: wrapUpSummary(plan) },
        { type: "text", delta: "Shall I save this so you can return to it?" }];
    } else if (index < 2) {
      const fixture = scriptedTurn(index, plan);
      const ops = fixture.events.filter((event) => event.type === "op");
      if (index === 1) {
        const renewalIndex = ops.findIndex((event) => event.op.op === "add_line" && event.op.title === "Firewall subscription renewal");
        let beforeRenewal = plan;
        for (const event of ops.slice(0, renewalIndex)) {
          const result = applyOp(beforeRenewal, event.op, "advisor");
          if (result.ok) beforeRenewal = result.plan;
        }
        const op = { op: "add_initiative" as const, objectiveId: "o2",
          title: "Keep the firewall subscription current", disposition: "fund" as const, proactive: true,
          rationale: "Include the August renewal in the cash plan so protection continues.",
          sources: [{ title: "Demo planning assumption: August renewal", date: "2026-10", kind: "trend_brief" as const }] };
        const proactive = applyOp(beforeRenewal, op, "advisor");
        const renewal = ops[renewalIndex];
        if (proactive.ok && renewal?.op.op === "add_line") {
          renewal.op = { ...renewal.op, initiativeId: proactive.createdId! };
          ops.splice(renewalIndex, 0, { type: "op", op, version: proactive.plan.version, createdId: proactive.createdId });
        }
      }
      // Spread proposals across the reply. There is still text after the last
      // operation, so the leader sees the plan forming while advice arrives.
      const words = fixture.events.filter((event) => event.type === "text");
      events = [{ type: "status", status: "planning" }];
      const cadence = Math.max(1, Math.floor(words.length / (ops.length + 1)));
      for (let n = 0; n < words.length; n++) {
        if (n % cadence === 0 && ops.length) events.push(ops.shift()!);
        events.push(words[n]);
      }
      events.push(...ops);
    }
    else {
      const reply = /\b(cost|price|quote|estimate|laptops)\b/i.test(message)
        ? "That line stays Unpriced until we have a dated source. A scoped quote will give us a defensible price, or you can enter your own labelled estimate."
        : "The draft is on the right. You can accept the proposals that fit, or set them aside with a reason. Shall we work through the unpriced lines?";
      events = [{ type: "status", status: "thinking" }, ...reply.split(/(?<= )/).map((delta): AdvisorEvent => ({ type: "text", delta }))];
    }
    for (const event of events) {
      signal.throwIfAborted();
      if (event.type === "done") continue;
      if (event.type === "op") {
        await delay(options.opDelayMs ?? 250, undefined, { signal });
        const result = applyOp(plan, event.op, "advisor");
        if (!result.ok) continue;
        await store.updatePlan(session.id, result.plan);
        plan = result.plan;
        emit({ ...event, createdId: result.createdId, version: plan.version });
      } else {
        if (event.type === "text") {
          await delay(options.wordDelayMs ?? 30, undefined, { signal });
          text += event.delta;
        }
        emit(event);
      }
    }
  } catch { failure = true; }
  try { await store.appendTurn(session.id, [{ role: "user", content: message }, ...(text ? [{ role: "assistant", content: text }] : [])], plan); }
  catch {
    emit({ type: "error", message: "I couldn't save this turn. Please reload your plan before continuing.", retryable: false });
    emit({ type: "done", plan });
    return plan;
  }
  if (failure) emit({ type: "error", message: "I couldn't complete this reply. Your applied plan changes are kept. Please try again.", retryable: true });
  emit({ type: "done", plan });
  return plan;
}
