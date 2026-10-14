import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlan } from "@/lib/plan/types";
import { applyOp } from "@/lib/plan/ops";
import type { SessionStore } from "@/lib/session/store";
const jar = vi.hoisted(() => {
  const values = new Map<string, string>();
  return { values, get: vi.fn((name: string) => values.has(name) ? { value: values.get(name) } : undefined),
    set: vi.fn((name: string, value: string) => values.set(name, value)) };
});
vi.mock("next/headers", () => ({ cookies: async () => jar }));
import { getSessionStore } from "@/lib/session";
import { getOrCreate } from "@/lib/session/cookie";
import { PlanVersionConflict } from "@/lib/session/prisma-store";
import { POST as save } from "./route";
import { GET as resume } from "../../plan/route";
import { POST as op } from "../../plan/op/route";
import { GET as returnLink } from "../../../r/[token]/route";

const globalStore = globalThis as typeof globalThis & { budgetBuddySessionStore?: SessionStore };
const details = { name: "Test CTO", email: "cto@example.test", organisation: "Example", role: "CTO", consentEmail: true };
const request = (body: unknown) => new Request("https://plan.example.test/api/session/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const returnRequest = (token: string) => returnLink(new Request(`https://plan.example.test/r/${token}`), { params: Promise.resolve({ token }) });

beforeEach(() => {
  delete globalStore.budgetBuddySessionStore;
  jar.values.clear(); vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("APP_URL", "https://plan.example.test");
  vi.stubEnv("SMTP_HOST", "");
});
afterEach(() => { delete globalStore.budgetBuddySessionStore; vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function firstReply() {
  const session = await getOrCreate();
  const result = applyOp(session.plan, { op: "add_objective", title: "Fewer outages" }, "advisor");
  if (!result.ok) throw new Error(result.error);
  await getSessionStore().appendTurn(session.id, [
    { role: "system", content: "Never expose the prompt" },
    { role: "user", content: "Fewer outages" },
    { role: "assistant", content: "Power comes first.", tool_calls: [{ secret: "tool internals" }] },
    { role: "tool", content: "Never expose tool results" },
  ], result.plan);
  return session;
}

describe("session route flow", () => {
  it("creates nothing on page-view resume and requires a first reply for ops/save", async () => {
    const create = vi.spyOn(getSessionStore(), "create");
    expect((await resume()).status).toBe(401);
    expect((await op(request({ op: { op: "add_objective", title: "A" } }))).status).toBe(401);
    expect((await save(request(details))).status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("resumes private history, persists a user decision and restores another device", async () => {
    const session = await firstReply();
    const before = await resume();
    expect(before.headers.get("cache-control")).toBe("no-store");
    expect(await before.json()).toMatchObject({ saved: false, messages: [
      { role: "user", content: "Fewer outages" }, { role: "assistant", content: "Power comes first." },
    ] });
    const decision = await op(request({ op: { op: "set_state", id: "o1", state: "accepted" } }));
    expect(decision.status).toBe(200);
    expect((await getSessionStore().findByToken(session.token))?.plan.objectives[0].state).toBe("accepted");
    const savedResponse = await save(request(details));
    expect(savedResponse.status).toBe(200);
    expect(await savedResponse.json()).toEqual({ saved: true, emailed: false, returnUrl: `https://plan.example.test/r/${session.token}` });
    expect((await getSessionStore().findByToken(session.token))?.contact?.consentContact).toBe(false);
    expect(await (await resume()).json()).toMatchObject({ saved: true });
    jar.values.clear();
    expect((await resume()).status).toBe(401);
    const response = await returnRequest(session.token);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://plan.example.test/");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(jar.set).toHaveBeenCalledWith("bb_session", session.token, expect.objectContaining({ httpOnly: true }));
    expect(await (await resume()).json()).toMatchObject({ saved: true, plan: { objectives: [{ state: "accepted" }] } });
  });

  it("persists dismissed initiatives and reasons for the advisor's next turn", async () => {
    const session = await firstReply();
    const loaded = (await getSessionStore().findByToken(session.token))!;
    const proposed = applyOp(loaded.plan, { op: "add_initiative", objectiveId: "o1", title: "SD-WAN", disposition: "investigate", rationale: "Check branch needs." }, "advisor");
    if (!proposed.ok) throw new Error(proposed.error);
    await getSessionStore().appendTurn(session.id, [], proposed.plan);
    expect((await op(request({ op: { op: "set_state", id: "i2", state: "dismissed", reason: "Power first" } }))).status).toBe(200);
    expect((await getSessionStore().findByToken(session.token))?.plan.initiatives[0]).toMatchObject({ state: "dismissed", dismissReason: "Power first" });
  });

  it("rejects missing email consent, malformed JSON and invalid details before saving", async () => {
    const session = await firstReply();
    expect((await save(request({ ...details, consentEmail: false }))).status).toBe(400);
    expect((await save(request({ ...details, email: "bad" }))).status).toBe(400);
    expect((await save(new Request("https://plan.example.test/api/session/save", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await getSessionStore().findByToken(session.token))?.savedAt).toBeNull();
    expect((await save(request({ ...details, consentContact: true }))).status).toBe(200);
    expect((await getSessionStore().findByToken(session.token))?.contact?.consentContact).toBe(true);
    expect((await save(request({ ...details, consentContact: false }))).status).toBe(200);
    expect((await getSessionStore().findByToken(session.token))?.contact?.consentContact).toBe(false);
  });

  it("returns reducer errors verbatim and 409 for stale writes", async () => {
    await firstReply();
    const missing = await op(request({ op: { op: "set_state", id: "o9", state: "accepted" } }));
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "No item o9." });
    expect((await op(request({ op: { op: "unknown" } }))).status).toBe(400);
    expect((await op(new Request("https://plan.example.test/api/plan/op", { method: "POST", body: "{" }))).status).toBe(400);
    vi.spyOn(getSessionStore(), "updatePlan").mockRejectedValueOnce(new PlanVersionConflict());
    expect((await op(request({ op: { op: "set_state", id: "o1", state: "accepted" } }))).status).toBe(409);
  });

  it("never restores unknown, unsaved or malformed return links", async () => {
    const unsaved = await firstReply();
    jar.values.clear();
    for (const token of ["invalid", "a".repeat(43), unsaved.token]) {
      const response = await returnRequest(token);
      expect(response.headers.get("location")).toBe("https://plan.example.test/?notice=link-expired");
      expect(jar.values.size).toBe(0);
    }
  });

  it("returns recoverable failures without logging private data", async () => {
    await firstReply();
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    const find = vi.spyOn(getSessionStore(), "findByToken").mockRejectedValue(new Error("secret private data"));
    expect((await resume()).status).toBe(503);
    expect((await save(request(details))).status).toBe(503);
    expect((await op(request({ op: { op: "add_objective", title: "A" } }))).status).toBe(503);
    const response = await returnRequest("a".repeat(43));
    expect(response.headers.get("location")).toContain("notice=resume-unavailable");
    expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    find.mockRestore();
    vi.stubEnv("APP_URL", "");
    expect((await save(request(details))).status).toBe(503);
  });
});

it("allows no contact details to appear in the resume response", async () => {
  const session = await firstReply();
  await save(request(details));
  const body = await (await resume()).json();
  expect(Object.keys(body).sort()).toEqual(["messages", "plan", "saved"]);
  expect(JSON.stringify(body)).not.toContain(details.email);
  expect(body.plan).not.toEqual(emptyPlan());
  expect((await getSessionStore().findByToken(session.token))?.contact).not.toBeNull();
});
