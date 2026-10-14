import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { createDemoServer } from "./demo-server";
import { AdvisorTransport, inferStage } from "./transport";
import { main, runScenario, parseOptions } from "./runner";
import { loadScenarios } from "./scenarios";
import { emptyPlan } from "../src/lib/plan/types";
import { type AdvisorEvent } from "../src/lib/advisor/events";

const server = createDemoServer();
let baseUrl = "";
beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
function response(events: unknown[], extra: HeadersInit = {}) {
  return new Response(events.map((e) => JSON.stringify(e)).join("\n"), { headers: { "Content-Type": "application/x-ndjson", ...extra } });
}
const done: AdvisorEvent = { type: "done", plan: emptyPlan() };
describe("HTTP runner", () => {
  it("drives real HTTP, readEvents and isolated cookie-backed in-memory sessions", async () => {
    const jar = new AdvisorTransport(baseUrl);
    const first = await jar.turn("Hello", new AbortController().signal);
    const second = await jar.turn("Mostly power", new AbortController().signal);
    expect(first.fixture).toBe(true);
    expect(first.plan.objectives).toHaveLength(2);
    expect(second.plan.initiatives).toHaveLength(2);
    expect(second.plan.lines).toHaveLength(3);
    expect(second.plan.version).toBeGreaterThan(first.plan.version);
    expect((await new AdvisorTransport(baseUrl).turn("Hello", new AbortController().signal)).plan).toEqual(first.plan);
  });
  it("runs all keyless demo scenarios to a bounded stop", async () => {
    for (const scenario of await loadScenarios()) {
      const result = await runScenario(scenario, { mode: "demo", baseUrl, vendors: [], signal: new AbortController().signal });
      expect(result.stop).toBe("max_turns");
      expect(result.turns).toHaveLength(scenario.maxTurns);
      expect(result.findings).toEqual([]);
      expect(result.judge).toBeNull();
      expect(result.fixture).toBe(true);
    }
  });
  it("stops on wrap_up and judges without asking another user question", async () => {
    const scenario = (await loadScenarios())[0];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([{ type: "wrap_up", summary: "All lines remain unpriced." }, done]));
    const models = { user: vi.fn(), judge: vi.fn().mockResolvedValue(null) };
    const result = await runScenario(scenario, { mode: "live", baseUrl, vendors: [], signal: new AbortController().signal,
      transport: new AdvisorTransport(baseUrl, fetcher), models });
    expect(result.stop).toBe("wrap_up");
    expect(result.turns).toHaveLength(1);
    expect(models.user).not.toHaveBeenCalled();
    expect(models.judge).toHaveBeenCalledOnce();
  });
  it("stops when the live simulated user's goal is met", async () => {
    const models = { user: vi.fn().mockResolvedValue({ message: "Done", goalMet: true }), judge: vi.fn().mockResolvedValue(null) };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([{ type: "text", delta: "Keep it unpriced." }, done]));
    const result = await runScenario((await loadScenarios())[0], { mode: "live", baseUrl, vendors: [], signal: new AbortController().signal,
      transport: new AdvisorTransport(baseUrl, fetcher), models });
    expect(result.stop).toBe("goal_met");
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("handles server and judge failures without provider text in errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("Sensitive body", { status: 500 }));
    const result = await runScenario((await loadScenarios())[0], { mode: "demo", baseUrl, vendors: [], signal: new AbortController().signal,
      transport: new AdvisorTransport(baseUrl, fetcher) });
    expect(result.stop).toBe("error");
    expect(result.error).not.toContain("Sensitive");
    const models = { user: vi.fn().mockResolvedValue({ message: "Done", goalMet: true }), judge: vi.fn().mockRejectedValue(new Error("Private model output")) };
    const good = vi.fn<typeof fetch>().mockResolvedValue(response([done]));
    const judged = await runScenario((await loadScenarios())[0], { mode: "live", baseUrl, vendors: [], signal: new AbortController().signal,
      transport: new AdvisorTransport(baseUrl, good), models });
    expect(judged.stop).toBe("error");
    expect(judged.error).not.toContain("Private");
  });
  it("propagates the suite deadline to HTTP and records failure", async () => {
    const abort = new AbortController();
    abort.abort();
    const result = await runScenario((await loadScenarios())[0], { mode: "demo", baseUrl, vendors: [], signal: abort.signal });
    expect(result.stop).toBe("error");
    expect(result.error).toContain("deadline");
  });
  it("retains cookies, handles rotation and removes expired cookies", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response([done], { "Set-Cookie": "bb_session=one; HttpOnly; Path=/" }))
      .mockResolvedValueOnce(response([done], { "Set-Cookie": "bb_session=two; HttpOnly; Path=/" }))
      .mockResolvedValueOnce(response([done], { "Set-Cookie": "bb_session=; Max-Age=0; Path=/" }))
      .mockResolvedValueOnce(response([done]));
    const transport = new AdvisorTransport(baseUrl, fetcher);
    for (let i = 0; i < 4; i++) await transport.turn("Hello", new AbortController().signal);
    const cookie = (index: number) => (fetcher.mock.calls[index][1]!.headers as Record<string, string>).Cookie;
    expect([cookie(0), cookie(1), cookie(2), cookie(3)]).toEqual(["", "bb_session=one", "bb_session=two", ""]);
  });
  it.each([
    new Response("{}", { headers: { "Content-Type": "application/json" } }),
    response([{ type: "text", delta: "Missing done" }]),
    response([{ type: "done", plan: {} }]),
  ])("rejects invalid stream boundaries", async (bad) => {
    const transport = new AdvisorTransport(baseUrl, vi.fn<typeof fetch>().mockResolvedValue(bad));
    await expect(transport.turn("Hello", new AbortController().signal)).rejects.toThrow();
  });
  it("classifies initiative operations as advice even in a price request", () => {
    expect(inferStage("What will it cost?", [])).toBe("budget");
    expect(inferStage("Finish", [{ type: "wrap_up", summary: "Ready" }])).toBe("wrap_up");
    expect(inferStage("What will it cost?", [{ type: "op", op: { op: "update_initiative", id: "i1", rationale: "Keep it" }, version: 2 }])).toBe("advice");
    expect(inferStage("What options do we have?", [])).toBe("advice");
  });
  it("validates arguments and honours configured URLs", () => {
    expect(parseOptions(["--mode", "demo", "--scenario", "6"])).toMatchObject({ mode: "demo", scenario: 6 });
    expect(parseOptions([], { EVAL_BASE_URL: baseUrl }).baseUrl).toBe(baseUrl);
    for (const args of [["--scenario", "0"], ["--mode", "unknown"], ["--mode"], ["--other", "x"], ["--base-url", "file:///etc"], ["--base-url", "http://user:secret@localhost:3207"]]) {
      expect(() => parseOptions(args)).toThrow();
    }
  });
});

it("prints help successfully without model configuration or HTTP calls", async () => {
  const write=vi.spyOn(process.stdout,"write").mockReturnValue(true);
  try {
    expect(await main(["--help"])).toBe(0);
    expect(write).toHaveBeenCalledWith(expect.stringContaining("Usage: pnpm eval"));
  } finally { write.mockRestore(); }
});
