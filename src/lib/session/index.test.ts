import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyOp } from "@/lib/plan/ops";
import { emptyPlan } from "@/lib/plan/types";
import type { SessionStore } from "./store";
import { PlanVersionConflict, PrismaSessionStore, UNSAVED_MAX_AGE_MS } from "./prisma-store";
import { getSessionStore, sessionStore } from "./index";
const globalStore = globalThis as typeof globalThis & { budgetBuddySessionStore?: SessionStore };

beforeEach(() => { delete globalStore.budgetBuddySessionStore; vi.stubEnv("DATABASE_URL", ""); });
afterEach(() => { delete globalStore.budgetBuddySessionStore; vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("session factory", () => {
  it("returns one lazy memory store and resumes without sharing another browser's plan", async () => {
    expect(globalStore.budgetBuddySessionStore).toBeUndefined();
    expect(getSessionStore()).toBe(getSessionStore());
    const first = await sessionStore.create();
    const second = await sessionStore.create();
    const result = applyOp(first.plan, { op: "add_objective", title: "Fewer outages" }, "advisor");
    if (!result.ok) throw new Error(result.error);
    await sessionStore.appendTurn(first.id, [{ role: "user", content: "Fewer outages" }], result.plan);
    result.plan.objectives[0].title = "Attempted alias mutation";
    expect((await sessionStore.findByToken(first.token))?.plan.objectives[0].title).toBe("Fewer outages");
    expect((await sessionStore.findByToken(second.token))?.plan).toEqual(emptyPlan());
    expect((await sessionStore.findByToken(first.token))?.messages).toHaveLength(1);
  });

  it("uses Prisma when DATABASE_URL is configured without connecting eagerly", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5434/test");
    expect(getSessionStore()).toBeInstanceOf(PrismaSessionStore);
  });

  it("rejects competing concurrent changes and corrupt writes in memory", async () => {
    const store = getSessionStore();
    const session = await store.create();
    const a = applyOp(session.plan, { op: "add_objective", title: "A" }, "user");
    const b = applyOp(session.plan, { op: "add_objective", title: "B" }, "user");
    if (!a.ok || !b.ok) throw new Error("Reducer failed");
    const outcomes = await Promise.allSettled([store.updatePlan(session.id, a.plan), store.updatePlan(session.id, b.plan)]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.find((result) => result.status === "rejected")).toMatchObject({ reason: expect.any(PlanVersionConflict) });
    await expect(store.updatePlan(session.id, { ...emptyPlan(), nextId: 0 })).rejects.toThrow();
  });

  it("expires inactive unsaved sessions but keeps saved plans", async () => {
    vi.useFakeTimers();
    const store = getSessionStore();
    const unsaved = await store.create();
    const saved = await store.create();
    await store.save(saved.id, { name: "Test", email: "test@example.test", organisation: "Example", role: "CSO", consentEmail: true, consentContact: false });
    vi.advanceTimersByTime(UNSAVED_MAX_AGE_MS + 1);
    expect(await store.findByToken(unsaved.token)).toBeNull();
    expect(await store.findByToken(saved.token)).not.toBeNull();
  });
});
