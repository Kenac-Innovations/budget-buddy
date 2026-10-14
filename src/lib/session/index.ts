import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { emptyPlan, Plan } from "@/lib/plan/types";
import {
  ContactInput, PrismaSessionStore, SessionMessages, UNSAVED_MAX_AGE_MS, checkPlanVersion,
} from "./prisma-store";
import { newToken, type AdvisorSessionRecord, type ContactDetails, type SessionStore } from "./store";

/** Keep the frozen development store, adding the same guards as persistence. */
export class ValidatedMemoryStore implements SessionStore {
  private records = new Map<string, AdvisorSessionRecord>();
  private tokens = new Map<string, string>();
  private touched = new Map<string, number>();
  private writes = new Map<string, Promise<void>>();

  private async locked(id: string, write: () => Promise<void>) {
    const previous = this.writes.get(id) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => { release = resolve; });
    this.writes.set(id, next);
    await previous;
    try { await write(); } finally {
      release();
      if (this.writes.get(id) === next) this.writes.delete(id);
    }
  }

  async create() {
    const session: AdvisorSessionRecord = { id: newToken().slice(0, 16), token: newToken(), plan: emptyPlan(), messages: [], contact: null, savedAt: null };
    this.records.set(session.id, session);
    this.tokens.set(session.id, session.token);
    this.touched.set(session.id, Date.now());
    return structuredClone(session);
  }

  async findByToken(token: string) {
    const session = structuredClone(this.records.get(this.tokensByValue(token)) ?? null);
    if (!session || (!session.savedAt && (this.touched.get(session.id) ?? 0) <= Date.now() - UNSAVED_MAX_AGE_MS)) return null;
    session.plan = Plan.parse(session.plan);
    session.messages = SessionMessages.parse(session.messages);
    if (session.contact) session.contact = ContactInput.parse(session.contact);
    return session;
  }

  private tokensByValue(token: string) {
    return [...this.tokens].find(([, value]) => value === token)?.[0] ?? "";
  }

  async deleteByToken(token: string) {
    const id = this.tokensByValue(token);
    await this.locked(id, async () => {
      this.records.delete(id);
      this.tokens.delete(id);
      this.touched.delete(id);
    });
  }

  private async validate(id: string, input: Plan) {
    const current = await this.findByToken(this.tokens.get(id) ?? "");
    if (!current) throw new Error("Session unavailable");
    const plan = Plan.parse(input);
    checkPlanVersion(current.plan, plan);
    return plan;
  }

  async appendTurn(id: string, messages: unknown[], input: Plan) {
    await this.locked(id, async () => {
      const plan = await this.validate(id, input);
      const record = this.records.get(id)!;
      record.messages.push(...SessionMessages.parse(messages));
      record.plan = structuredClone(plan);
      this.touched.set(id, Date.now());
    });
  }

  async updatePlan(id: string, input: Plan) {
    await this.locked(id, async () => {
      const plan = await this.validate(id, input);
      this.records.get(id)!.plan = structuredClone(plan);
      this.touched.set(id, Date.now());
    });
  }

  async save(id: string, contact: ContactDetails) {
    await this.locked(id, async () => {
      const current = this.records.get(id);
      if (!current) throw new Error("Session unavailable");
      current.contact = ContactInput.parse(contact);
      current.savedAt = new Date();
    });
  }
}

const globalStore = globalThis as typeof globalThis & { budgetBuddySessionStore?: SessionStore };

/** No query or session creation at import/page-view time. One store across route bundles and HMR. */
export function getSessionStore(): SessionStore {
  if (!globalStore.budgetBuddySessionStore) {
    globalStore.budgetBuddySessionStore = process.env.DATABASE_URL
      ? new PrismaSessionStore(new PrismaClient({
          adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 }),
        }))
      : new ValidatedMemoryStore();
  }
  return globalStore.budgetBuddySessionStore;
}

// Resolve once before the first operation. Never switch away from a store after
// it has served a session: a later outage must not silently discard saved data.
const resolutions = new WeakMap<SessionStore, Promise<SessionStore>>();
export async function resolveSessionStore(): Promise<SessionStore> {
  const store = getSessionStore();
  if (!(store instanceof PrismaSessionStore)) return store;
  let resolution = resolutions.get(store);
  if (!resolution) {
    resolution = (async () => {
      try { await store.checkConnection(); return store; }
      catch {
        if (process.env.ADVISOR_MODE !== "demo") throw new Error("Session database unavailable");
        const memory = new ValidatedMemoryStore();
        globalStore.budgetBuddySessionStore = memory;
        return memory;
      }
    })();
    resolutions.set(store, resolution);
  }
  return resolution;
}

/** Concrete adapter extension; the frozen SessionStore contract stays unchanged. */
export async function deleteSessionByToken(token: string) {
  const store = await resolveSessionStore();
  if (!(store instanceof PrismaSessionStore || store instanceof ValidatedMemoryStore)) throw new Error("Deletion unavailable");
  await store.deleteByToken(token);
}

export const sessionStore: SessionStore = {
  create: async () => (await resolveSessionStore()).create(),
  findByToken: async (token) => (await resolveSessionStore()).findByToken(token),
  appendTurn: async (id, messages, plan) => (await resolveSessionStore()).appendTurn(id, messages, plan),
  updatePlan: async (id, plan) => (await resolveSessionStore()).updatePlan(id, plan),
  save: async (id, contact) => (await resolveSessionStore()).save(id, contact),
};
