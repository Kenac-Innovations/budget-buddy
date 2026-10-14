import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient, AdvisorSession } from "@/generated/prisma/client";
import { emptyPlan } from "@/lib/plan/types";
import { applyOp } from "@/lib/plan/ops";
import { ContactInput, PlanVersionConflict, PrismaSessionStore, UNSAVED_MAX_AGE_MS } from "./prisma-store";

function fakeDatabase() {
  let row: AdvisorSession | null = null;
  const advisorSession = {
    create: vi.fn(async ({ data }) => {
      row = { id: "session-1", token: data.token, messages: [], plan: data.plan, planVersion: 0,
        contactName: null, contactEmail: null, organisation: null, role: null,
        consentEmail: false, consentContact: false, savedAt: null, createdAt: new Date(), updatedAt: new Date() };
      return structuredClone(row);
    }),
    findUnique: vi.fn(async () => structuredClone(row)),
    findUniqueOrThrow: vi.fn(async () => { if (!row) throw new Error("Missing row"); return structuredClone(row); }),
    update: vi.fn(async ({ data }) => { if (!row) throw new Error("Missing row"); Object.assign(row, data, { updatedAt: new Date() }); return structuredClone(row); }),
  };
  const tx = { advisorSession, $queryRaw: vi.fn<(strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>>(async () => []) };
  const prisma = { advisorSession, $transaction: vi.fn(async (fn) => fn(tx)) };
  return { prisma: prisma as unknown as PrismaClient, tx, advisorSession, row: () => row! };
}
function addObjective(title = "Fewer outages") {
  const result = applyOp(emptyPlan(), { op: "add_objective", title }, "advisor");
  if (!result.ok) throw new Error(result.error);
  return result.plan;
}
const contact = { name: "Test CTO", email: "cto@example.test", organisation: "Example", role: "CTO", consentEmail: true as const, consentContact: false };

describe("PrismaSessionStore", () => {
  let db: ReturnType<typeof fakeDatabase>;
  let store: PrismaSessionStore;
  beforeEach(() => { db = fakeDatabase(); store = new PrismaSessionStore(db.prisma); });

  it("round-trips the plan, append-only messages and exact contact consent", async () => {
    expect(db.advisorSession.create).not.toHaveBeenCalled();
    const session = await store.create();
    const plan = addObjective();
    await store.appendTurn(session.id, [{ role: "user", content: "Fewer outages" }], plan);
    await store.appendTurn(session.id, [{ role: "assistant", content: "Power comes first." }], plan);
    await store.save(session.id, contact);
    const loaded = await store.findByToken(session.token);
    expect(loaded?.plan).toEqual(plan);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.contact).toEqual(contact);
    expect(loaded?.savedAt).toBeInstanceOf(Date);
    expect(db.tx.$queryRaw.mock.calls[0][0].join("")).toContain("FOR UPDATE");
    expect(db.tx.$queryRaw.mock.calls[0][1]).toBe(session.id);
  });

  it("rejects stale versions and competing edits at the same version", async () => {
    const session = await store.create();
    await store.updatePlan(session.id, addObjective());
    await expect(store.updatePlan(session.id, emptyPlan())).rejects.toBeInstanceOf(PlanVersionConflict);
    await expect(store.updatePlan(session.id, addObjective("Open branches"))).rejects.toBeInstanceOf(PlanVersionConflict);
    expect(db.advisorSession.update).toHaveBeenCalledTimes(1);
  });

  it("rejects corrupt plan reads, writes and inconsistent version columns", async () => {
    const session = await store.create();
    await expect(store.updatePlan(session.id, { ...emptyPlan(), version: -1 })).rejects.toThrow();
    db.row().plan = { version: -1 };
    await expect(store.findByToken(session.token)).rejects.toThrow();
    db.row().plan = emptyPlan();
    db.row().planVersion = 2;
    await expect(store.findByToken(session.token)).rejects.toThrow("Invalid stored plan version");
  });

  it("validates messages before writing and refuses invalid save consent", async () => {
    const session = await store.create();
    await expect(store.appendTurn(session.id, [undefined], emptyPlan())).rejects.toThrow();
    await expect(store.save(session.id, { ...contact, consentEmail: false })).rejects.toThrow();
    await expect(store.save(session.id, { ...contact, email: "invalid" })).rejects.toThrow();
    expect(db.advisorSession.update).not.toHaveBeenCalled();
  });

  it("ignores malformed tokens and expires only inactive unsaved sessions", async () => {
    expect(await store.findByToken("invalid")).toBeNull();
    expect(db.advisorSession.findUnique).not.toHaveBeenCalled();
    const session = await store.create();
    db.row().updatedAt = new Date(Date.now() - UNSAVED_MAX_AGE_MS - 1);
    expect(await store.findByToken(session.token)).toBeNull();
    db.row().savedAt = new Date();
    Object.assign(db.row(), { contactName: contact.name, contactEmail: contact.email,
      organisation: contact.organisation, role: contact.role, consentEmail: true });
    expect(await store.findByToken(session.token)).not.toBeNull();
  });
});

it("validates save lengths, email, roles, consent defaults and exact booleans", () => {
  const { consentContact: ignored, ...input } = contact;
  void ignored;
  expect(ContactInput.parse(input).consentContact).toBe(false);
  expect(ContactInput.parse({ ...input, consentContact: true }).consentContact).toBe(true);
  for (const patch of [{ name: " " }, { name: "x".repeat(121) }, { organisation: "x".repeat(161) },
    { email: "not-email" }, { role: "ADMIN" }, { consentEmail: false }, { consentContact: "false" }, { name: "A\nB" }]) {
    expect(ContactInput.safeParse({ ...input, ...patch }).success).toBe(false);
  }
});

it("deletes the session and sharing audit atomically using token ownership", async () => {
  const advisorSession = { findUnique: vi.fn().mockResolvedValue({ id: "owned" }), deleteMany: vi.fn() };
  const auditEvent = { deleteMany: vi.fn() };
  const tx = { advisorSession, auditEvent, $queryRaw: vi.fn() };
  const prisma = { $transaction: vi.fn(async (fn) => fn(tx)) } as unknown as PrismaClient;
  await new PrismaSessionStore(prisma).deleteByToken("a".repeat(43));
  expect(auditEvent.deleteMany).toHaveBeenCalledWith({ where: { entity: "AdvisorSession", entityId: "owned" } });
  expect(advisorSession.deleteMany).toHaveBeenCalledWith({ where: { id: "owned", token: "a".repeat(43) } });
  expect(tx.$queryRaw).toHaveBeenCalled();
  await expect(new PrismaSessionStore(prisma).deleteByToken("invalid")).rejects.toThrow();
});
