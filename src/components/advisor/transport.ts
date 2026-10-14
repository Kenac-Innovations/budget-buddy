import { z } from "zod";
import { AdvisorEvent,readEvents,TurnRequest } from "@/lib/advisor/events";
import { PlanOp } from "@/lib/plan/ops";
import { Plan } from "@/lib/plan/types";
function pause(ms: number,signal: AbortSignal) {
  return new Promise<void>((resolve,reject) => {
    signal.throwIfAborted();
    const abort=() => { clearTimeout(timer); reject(new DOMException("Stopped","AbortError")); };
    const timer=setTimeout(() => { signal.removeEventListener("abort",abort); resolve(); },ms);
    signal.addEventListener("abort",abort,{ once: true });
  });
}
/** Only the unmerged development build can use fixtures. Deployed demos use T1's route. */
export async function* developmentTurn(index: number,plan: Plan,message: string,signal: AbortSignal): AsyncGenerator<AdvisorEvent> {
  if(process.env.NODE_ENV==="production")
    throw new Error("Development fixtures are disabled");
  const { scriptedTurn }=await import("@/lib/advisor/fixtures");
  yield { type: "status",status: "thinking" };
  await pause(500,signal);
  if(index>=2) {
    if(/wrap|save|finish/i.test(message)) {
      yield { type: "wrap_up",summary: `You have ${plan.objectives.length} objectives, ${plan.initiatives.length} initiatives and ${plan.lines.filter(l => !l.price&&l.state!=="dismissed").length} lines still to price. Your choices are recorded in the plan.` };
    }
    else {
      yield { type: "text",delta: "The draft is ready to review. Accept the items you want to carry forward, or add your own estimate to a budget line. Shall we wrap up?" };
    }
    yield { type: "done",plan };
    return;
  }
  const { events,plan: finalPlan }=scriptedTurn(index,plan);
  const ops=events.filter(e => e.type==="op");
  const words=events.filter(e => e.type==="text");
  // Interleave the unchanged fixture operations with text to exercise mid-reply rendering.
  for(let i=0;i<words.length;i++) {
    signal.throwIfAborted();
    if(i%8===0&&ops.length)
      yield ops.shift()!;
    yield words[i];
    await pause(65,signal);
  }
  for(const op of ops) {
    yield op;
    await pause(160,signal);
  }
  yield { type: "done",plan: finalPlan };
}
export async function* requestTurn(message: string,signal: AbortSignal,demo: boolean,index: number,plan: Plan): AsyncGenerator<AdvisorEvent> {
  const body=TurnRequest.parse({ message });
  const response=await fetch(`/api/advisor/turn${demo? "?demo":""}`,{
    method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify(body),signal,
  });
  if(response.status===404&&demo&&process.env.NODE_ENV!=="production") {
    yield* developmentTurn(index,plan,message,signal);
    return;
  }
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
export async function sendUserOp(op: PlanOp,signal: AbortSignal,allowLocal: boolean): Promise<Plan|null> {
  const response=await fetch("/api/plan/op",{
    method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify({ op: PlanOp.parse(op) }),signal,
  });
  if(response.status===404&&allowLocal&&process.env.NODE_ENV!=="production")
    return null;
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
