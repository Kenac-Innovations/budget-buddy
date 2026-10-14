import { z } from "zod";
import { AdvisorEvent,readEvents,TurnRequest } from "@/lib/advisor/events";
import { PlanOp } from "@/lib/plan/ops";
import { Plan } from "@/lib/plan/types";
export async function* requestTurn(message: string,signal: AbortSignal,demo: boolean): AsyncGenerator<AdvisorEvent> {
  const body=TurnRequest.parse({ message });
  const response=await fetch(`/api/advisor/turn${demo? "?demo":""}`,{
    method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify(body),signal,
  });
  if(!response.ok||!response.body)
    throw new Error("Advisor unavailable");
  let completed=false;
  for await(const event of readEvents(response.body)) {
    signal.throwIfAborted();
    if(event.type==="done")
      completed=true;
    yield event;
  }
  if(!completed)
    throw new Error("Incomplete reply");
}
const OpResponse=z.object({ plan: Plan });
export async function sendUserOp(op: PlanOp,signal: AbortSignal): Promise<Plan|null> {
  const response=await fetch("/api/plan/op",{
    method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify({ op: PlanOp.parse(op) }),signal,
  });
  if(response.status===409) {
    const session=await loadSession(signal);
    throw new PlanConflict(session?.plan??null);
  }
  if(!response.ok)
    throw new Error("Could not record this change. Try again.");
  return OpResponse.parse(await response.json()).plan;
}
const ResumeResponse=z.object({
  plan: Plan,
  messages: z.array(z.object({ role: z.enum(["user","assistant"]),content: z.string().max(20000) })).max(200),
  saved: z.boolean(),
});
export async function loadSession(signal: AbortSignal) {
  const response=await fetch("/api/plan",{ cache: "no-store",signal });
  if(response.status===204||response.status===401||response.status===404)
    return null;
  if(!response.ok)
    throw new Error("Could not load session");
  return ResumeResponse.parse(await response.json());
}
export class PlanConflict extends Error {
  constructor(readonly plan: Plan|null) { super("The plan changed. Review it and try again."); }
}
