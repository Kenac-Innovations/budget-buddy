import { z } from "zod";
import { PlanOp } from "@/lib/plan/ops";
import { Plan } from "@/lib/plan/types";

/**
 * Advisor stream protocol: newline-delimited JSON, one AdvisorEvent per line.
 *
 *   POST /api/advisor/turn   { message: string }   (session from the bb_session cookie)
 *   → 200 application/x-ndjson
 *
 * Order within a turn: status → (text | op)* → done. Plan ops arrive as they are applied, so the
 * plan panel animates while the advisor is still talking. `text` is the spoken-style reply: short,
 * conversational, at most one question. Detail lives in the plan, never in long text.
 */

export const AdvisorEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), status: z.enum(["thinking", "planning", "writing"]) }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({
    type: z.literal("op"),
    op: PlanOp,
    /** Id assigned by the reducer for add_* ops. */
    createdId: z.string().optional(),
    /** Plan version after this op. */
    version: z.number().int(),
  }),
  /** The advisor judges the plan ready to save; the UI shows the wrap-up card (journey stage 6). */
  z.object({ type: z.literal("wrap_up"), summary: z.string().max(600) }),
  z.object({ type: z.literal("error"), message: z.string(), retryable: z.boolean() }),
  /** Final authoritative plan; the client replaces its copy with this. */
  z.object({ type: z.literal("done"), plan: Plan }),
]);
export type AdvisorEvent = z.infer<typeof AdvisorEvent>;

export const TurnRequest = z.object({ message: z.string().min(1).max(4000) });
export type TurnRequest = z.infer<typeof TurnRequest>;

export function encodeEvent(event: AdvisorEvent): string {
  return JSON.stringify(event) + "\n";
}

/** Parses an NDJSON response body into events. Used by the UI and the evals. */
export async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<AdvisorEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield AdvisorEvent.parse(JSON.parse(line));
    }
  }
  if (buffer.trim()) yield AdvisorEvent.parse(JSON.parse(buffer));
}

/**
 * The opening message is fixed and rendered instantly, with no model call (journey stage 1).
 * [name] is replaced once the advisor's name is decided.
 */
export const ADVISOR_NAME = "Budget Buddy";
export const OPENING_MESSAGE = `Good afternoon. I'm ${ADVISOR_NAME}, an AI tech advisor run by Kenac Computer Systems. I'll help you shape your 2027 ICT plan and turn it into a budget you can defend. Your plan is private; Kenac only sees what you choose to share.

Shall we start with the big picture: roughly how big is the organisation, and what does the business most need from IT next year?`;
