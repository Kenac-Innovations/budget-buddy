import { afterEach, expect, it, vi } from "vitest";
import { InMemorySessionStore } from "@/lib/session/store";
import { applyOp } from "@/lib/plan/ops";
import { emptyPlan } from "@/lib/plan/types";
import { readEvents, type AdvisorEvent } from "./events";
import { createTurnHandler } from "./turn-handler";
import type { ResponsesClient } from "./agent";

const request = (message: unknown, cookie?: string) => new Request("http://localhost/api/advisor/turn", {
  method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(message),
});
async function collect(response: Response) {
  const events: AdvisorEvent[] = [];
  for await (const event of readEvents(response.body!)) events.push(event);
  return events;
}
afterEach(() => vi.unstubAllEnvs());

it("creates a secure lazy session, streams parseable demo turns and continues via cookie", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const store = new InMemorySessionStore();
  const create = vi.spyOn(store, "create");
  const handler = createTurnHandler({ store: () => store, mode: "demo", demoWordDelayMs: 0, demoOpDelayMs: 0 });
  expect(create).not.toHaveBeenCalled();
  const first = await handler(request({ message: "180 staff and four branches" }));
  expect(first.status).toBe(200);
  expect(first.headers.get("Content-Type")).toContain("application/x-ndjson");
  expect(first.headers.get("Cache-Control")).toContain("no-store");
  const cookie = first.headers.get("Set-Cookie")!;
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Max-Age=2592000", "Path=/"]) expect(cookie).toContain(flag);
  const events = await collect(first);
  expect(events.at(-1)?.type).toBe("done");
  let replay = emptyPlan();
  for (const event of events) if (event.type === "op") {
    const applied = applyOp(replay, event.op, "advisor");
    if (!applied.ok) throw new Error("Replay failed");
    replay = applied.plan;
  }
  if (events.at(-1)?.type === "done") {
    // JSON transport omits optional undefined fields in reducer objects.
    expect(JSON.parse(JSON.stringify(events.at(-1)))).toEqual({ type: "done", plan: JSON.parse(JSON.stringify(replay)) });
  }
  const second = await handler(request({ message: "Mostly power" }, cookie.split(";")[0]));
  const more = await collect(second);
  expect(second.headers.get("Set-Cookie")).toBeNull();
  expect(create).toHaveBeenCalledTimes(1);
  const done = more.at(-1);
  expect(done?.type).toBe("done");
  if (done?.type === "done") expect(done.plan.initiatives).toHaveLength(2);
  const token = cookie.split(";")[0].split("=")[1];
  expect((await store.findByToken(token))?.messages).toHaveLength(4);
});

it("validates before creating sessions and gives safe errors for malformed JSON and missing providers", async () => {
  const store = new InMemorySessionStore();
  const create = vi.spyOn(store, "create");
  const handler = createTurnHandler({ store: () => store });
  for (const body of [{ message: "" }, { message: "  " }, { message: "x".repeat(4001) }, { message: 4 }, {}]) expect((await handler(request(body))).status).toBe(400);
  expect((await handler(new Request("http://localhost/api/advisor/turn", { method: "POST", body: "not JSON" }))).status).toBe(400);
  expect((await handler(request({ message: "x".repeat(33000) }))).status).toBe(413);
  expect(create).not.toHaveBeenCalled();
  vi.stubEnv("ADVISOR_MODE", "invalid");
  expect((await handler(request({ message: "Hello" }))).status).toBe(503);
  vi.stubEnv("ADVISOR_MODE", "demo");
  const failing = createTurnHandler({ store: () => { throw new Error("name@example.com"); } });
  const response = await failing(request({ message: "Hello" }));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("name@example.com");
});

it("refreshes unknown cookies with a new session and leaves unrelated cookies alone", async () => {
  vi.stubEnv("NODE_ENV", "development");
  const store = new InMemorySessionStore();
  const handler = createTurnHandler({ store: () => store, mode: "demo", demoWordDelayMs: 0, demoOpDelayMs: 0 });
  const response = await handler(request({ message: "Finish" }, "unrelated=1; bb_session=missing"));
  expect(response.headers.get("Set-Cookie")).toContain("bb_session=");
  expect(response.headers.get("Set-Cookie")).not.toContain("Secure");
  await collect(response);
});

it("blocks overlapping turns and releases the lock after completion", async () => {
  const store = new InMemorySessionStore();
  const session = await store.create();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const client: ResponsesClient = { responses: { create: async () => (async function* () {
    await gate;
    yield { type: "response.output_text.delta", delta: "Review recovery." };
    yield { type: "response.completed", response: { output: [{ type: "message", id: "m1", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Review recovery.", annotations: [] }] }] } };
  })() } };
  const handler = createTurnHandler({ store: () => store, mode: "live", client });
  const cookie = `bb_session=${session.token}`;
  const first = await handler(request({ message: "Continue" }, cookie));
  const second = await handler(request({ message: "Continue again" }, cookie));
  expect(second.status).toBe(409);
  release();
  await collect(first);
  const third = await handler(request({ message: "Now continue" }, cookie));
  expect(third.status).toBe(200);
  await collect(third);
});

it("cancels a disconnected stream, persists history and releases its lock", async () => {
  const store = new InMemorySessionStore();
  const session = await store.create();
  const append = vi.spyOn(store, "appendTurn");
  const client: ResponsesClient = { responses: { create: async () => (async function* () { await new Promise(() => {}); })() } };
  const handler = createTurnHandler({ store: () => store, mode: "live", client });
  const response = await handler(request({ message: "Continue" }, `bb_session=${session.token}`));
  await response.body!.cancel();
  await vi.waitFor(() => expect(append).toHaveBeenCalled());
  expect((await store.findByToken(session.token))?.messages).toContainEqual({ role: "user", content: "Continue" });
});
