import { expect, it, vi } from "vitest";
import { InMemorySessionStore } from "@/lib/session/store";
import { applyOp } from "@/lib/plan/ops";
import { readEvents, AdvisorEvent } from "./events";
import { runDemo } from "./demo";
import { scriptedTurn } from "./fixtures";

it("streams both scripted turns, parses every line and resumes without duplicating proposals", async () => {
  const store = new InMemorySessionStore();
  let session = await store.create();
  for (const message of ["About 180 staff and four branches", "Mostly power"]) {
    const events: AdvisorEvent[] = [];
    const index = session.messages.length / 2;
    const expected = scriptedTurn(index, session.plan);
    await runDemo({ store, session, message, emit: (e) => events.push(e), wordDelayMs: 0, opDelayMs: 0 });
    expect(events.some((event) => event.type === "error")).toBe(false);
    const firstText=events.findIndex((event) => event.type === "text");
    const lastOp=events.map((event) => event.type).lastIndexOf("op");
    expect(lastOp).toBeGreaterThan(firstText);
    expect(events.slice(lastOp+1).some((event) => event.type === "text")).toBe(true);
    let replay=session.plan;
    for (const event of events) if (event.type === "op") {
      const result=applyOp(replay,event.op,"advisor");
      expect(result.ok).toBe(true);
      if (result.ok) replay=result.plan;
    }
    session = (await store.findByToken(session.token))!;
    expect(session.plan).toEqual(replay);
    if (index===0) expect(session.plan).toEqual(expected.plan);
    else expect(session.plan.initiatives.some((item) => item.proactive)).toBe(true);
  }
  const before = session.plan;
  const events: AdvisorEvent[] = [];
  await runDemo({ store, session, message: "What will solar cost?", emit: (e) => events.push(e), wordDelayMs: 0, opDelayMs: 0 });
  expect(events.some((e) => e.type === "op")).toBe(false);
  expect(events.filter((e) => e.type === "text").map((e) => e.delta).join("")).toContain("Unpriced");
  expect(events.at(-1)).toEqual({ type: "done", plan: before });
  // Verify actual stream encoder/decoder together rather than splitting JSON ourselves.
  const { encodeEvent } = await import("./events");
  const body = new ReadableStream<Uint8Array>({ start(controller) {
    const bytes = new TextEncoder().encode(events.map(encodeEvent).join(""));
    for (let n = 0; n < bytes.length; n += 7) controller.enqueue(bytes.slice(n, n + 7));
    controller.close();
  } });
  const parsed = [];
  for await (const event of readEvents(body)) parsed.push(event);
  expect(parsed).toEqual(events);
});

it("uses server totals for wrap-up", async () => {
  const store = new InMemorySessionStore();
  const session = await store.create();
  const events: AdvisorEvent[] = [];
  await runDemo({ store, session, message: "Let's wrap up", emit: (e) => events.push(e), wordDelayMs: 0 });
  expect(events.find((e) => e.type === "wrap_up")).toMatchObject({ summary: expect.stringContaining("0 accepted objectives") });
  expect(events.some((e) => e.type === "op")).toBe(false);
});

it("retains applied ops on cancellation and reports persistence errors without logs", async () => {
  const store = new InMemorySessionStore();
  const session = await store.create();
  const controller = new AbortController();
  const events: AdvisorEvent[] = [];
  await runDemo({ store, session, message: "180 staff", signal: controller.signal, wordDelayMs: 0, opDelayMs: 0,
    emit: (e) => { events.push(e); if (e.type === "op") controller.abort(); } });
  const opEvent = events.find((e) => e.type === "op")!;
  const replay = applyOp(session.plan, opEvent.op, "advisor");
  if (!replay.ok) throw new Error("fixture");
  expect((await store.findByToken(session.token))?.plan).toEqual(replay.plan);
  expect(events.some((e) => e.type === "error")).toBe(true);
  const failing = await store.create();
  vi.spyOn(store, "appendTurn").mockRejectedValueOnce(new Error("name@example.com"));
  const failures: AdvisorEvent[] = [];
  await runDemo({ store, session: failing, message: "Finish", emit: (e) => failures.push(e), wordDelayMs: 0 });
  expect(failures).toContainEqual({ type: "error", message: expect.stringContaining("couldn't save"), retryable: false });
  expect(JSON.stringify(failures)).not.toContain("name@example.com");
});
