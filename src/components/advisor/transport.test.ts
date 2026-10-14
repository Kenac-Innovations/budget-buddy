import { afterEach,describe,expect,it,vi } from "vitest";
import { encodeEvent,AdvisorEvent } from "@/lib/advisor/events";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { applyOp,type PlanOp } from "@/lib/plan/ops";
import { emptyPlan } from "@/lib/plan/types";
import { InMemorySessionStore } from "@/lib/session/store";
import { loadSession,PlanConflict,requestTurn,sendUserOp } from "./transport";
const response=(events: AdvisorEvent[]) => new Response(events.map(encodeEvent).join(""),{ headers: { "Content-Type": "application/x-ndjson" } });
async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[]=[];
  for await(const value of source) values.push(value);
  return values;
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("advisor transport",() => {
  it("uses the same route in demo mode and consumes validated NDJSON",async () => {
    const fixture=scriptedTurn(0);
    const fetch=vi.fn().mockResolvedValue(response(fixture.events));
    vi.stubGlobal("fetch",fetch);
    const signal=new AbortController().signal;
    expect(await collect(requestTurn("180 staff",signal,true))).toEqual(fixture.events.map(e => AdvisorEvent.parse(JSON.parse(encodeEvent(e)))));
    expect(fetch).toHaveBeenCalledWith("/api/advisor/turn?demo",expect.objectContaining({ signal,body: JSON.stringify({ message: "180 staff" }) }));
  });
  it("rejects a truncated reply after retaining the operations already delivered",async () => {
    const events=scriptedTurn(0).events.filter(e => e.type!=="done");
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response(events)));
    const received: AdvisorEvent[]=[];
    await expect((async () => {
      for await(const e of requestTurn("hello",new AbortController().signal,false))
        received.push(e);
    })()).rejects.toThrow("Incomplete");
    expect(received.some(e => e.type==="op")).toBe(true);
  });
  it("rejects invalid model events and input before trusting them",async () => {
    const fetch=vi.fn().mockResolvedValue(new Response('{"type":"done","plan":{}}\n'));
    vi.stubGlobal("fetch",fetch);
    await expect(collect(requestTurn("",new AbortController().signal,false))).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
    await expect(collect(requestTurn("hello",new AbortController().signal,false))).rejects.toThrow();
  });
  it("never falls back to local fixtures or user changes in production",async () => {
    vi.stubEnv("NODE_ENV","production");
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(null,{ status: 404 })));
    await expect(collect(requestTurn("hello",new AbortController().signal,true))).rejects.toThrow("unavailable");
    await expect(sendUserOp({ op: "set_state",id: "o1",state: "accepted" },new AbortController().signal)).rejects.toThrow();
  });
});
describe("user operations and session integration",() => {
  it("persists user choices in an in-memory session and returns the server plan",async () => {
    const store=new InMemorySessionStore();
    const session=await store.create();
    await store.appendTurn(session.id,[{ role: "user",content: "180 staff" }],scriptedTurn(0).plan);
    vi.stubGlobal("fetch",vi.fn(async (_url: string,init: RequestInit) => {
      const { op }=JSON.parse(String(init.body)) as {
        op: PlanOp;
      };
      const current=(await store.findByToken(session.token))!;
      const result=applyOp(current.plan,op,"user");
      if(!result.ok)
        return new Response(null,{ status: 400 });
      await store.updatePlan(session.id,result.plan);
      return Response.json({ plan: result.plan });
    }));
    const plan=await sendUserOp({ op: "set_state",id: "o1",state: "accepted" },new AbortController().signal);
    expect(plan?.objectives[0].state).toBe("accepted");
    expect((await store.findByToken(session.token))?.plan).toEqual(plan);
  });
  it("refetches the authoritative session after a version conflict",async () => {
    const plan=scriptedTurn(0).plan;
    const fetch=vi.fn().mockResolvedValueOnce(new Response(null,{ status: 409 })).mockResolvedValueOnce(Response.json({ plan,messages: [],saved: false }));
    vi.stubGlobal("fetch",fetch);
    let conflict: unknown;
    try {
      await sendUserOp({ op: "set_state",id: "o1",state: "accepted" },new AbortController().signal);
    }
    catch(e) {
      conflict=e;
    }
    expect(conflict).toBeInstanceOf(PlanConflict);
    expect((conflict as PlanConflict).plan).toEqual(plan);
    expect(fetch.mock.calls[1][0]).toBe("/api/plan");
  });
  it("loads display-only history and saved state, validating the boundary",async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(Response.json({ plan: emptyPlan(),messages: [{ role: "assistant",content: "Welcome back." }],saved: true })).mockResolvedValueOnce(Response.json({ plan: {},messages: [],saved: false })));
    expect((await loadSession(new AbortController().signal))?.saved).toBe(true);
    await expect(loadSession(new AbortController().signal)).rejects.toThrow();
  });
  it("rejects failed mutations and malformed successful responses",async () => {
    vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(null,{ status: 500 })).mockResolvedValueOnce(Response.json({ plan: {} })));
    const op: PlanOp={ op: "set_state",id: "o1",state: "accepted" };
    await expect(sendUserOp(op,new AbortController().signal)).rejects.toThrow();
    await expect(sendUserOp(op,new AbortController().signal)).rejects.toThrow();
  });
});

it("treats a 204 resume as a normal fresh visit", async () => {
  const fetch=vi.fn().mockResolvedValue(new Response(null,{status:204}));
  vi.stubGlobal("fetch",fetch);
  expect(await loadSession(new AbortController().signal)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
