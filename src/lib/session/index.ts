import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Plan } from "@/lib/plan/types";
import {
  ContactInput, PrismaSessionStore, SessionMessages, UNSAVED_MAX_AGE_MS, checkPlanVersion,
} from "./prisma-store";
import { InMemorySessionStore, type ContactDetails, type SessionStore } from "./store";

/** Keep the frozen development store, adding the same guards as persistence. */
class ValidatedMemoryStore extends InMemorySessionStore {
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

  override async create() {
    const session = await super.create();
    this.tokens.set(session.id, session.token);
    this.touched.set(session.id, Date.now());
    return session;
  }

  override async findByToken(token: string) {
    const session = await super.findByToken(token);
    if (!session || (!session.savedAt && (this.touched.get(session.id) ?? 0) <= Date.now() - UNSAVED_MAX_AGE_MS)) return null;
    session.plan = Plan.parse(session.plan);
    session.messages = SessionMessages.parse(session.messages);
    if (session.contact) session.contact = ContactInput.parse(session.contact);
    return session;
  }

  private async validate(id: string, input: Plan) {
    const current = await this.findByToken(this.tokens.get(id) ?? "");
    if (!current) throw new Error("Session unavailable");
    const plan = Plan.parse(input);
    checkPlanVersion(current.plan, plan);
    return plan;
  }

  override async appendTurn(id: string, messages: unknown[], input: Plan) {
    await this.locked(id, async () => {
      const plan = await this.validate(id, input);
      await super.appendTurn(id, SessionMessages.parse(messages), structuredClone(plan));
      this.touched.set(id, Date.now());
    });
  }

  override async updatePlan(id: string, input: Plan) {
    await this.locked(id, async () => {
      const plan = await this.validate(id, input);
      await super.updatePlan(id, structuredClone(plan));
      this.touched.set(id, Date.now());
    });
  }

  override async save(id: string, contact: ContactDetails) {
    await super.save(id, ContactInput.parse(contact));
  }
}

const globalStore = globalThis as typeof globalThis & { budgetBuddySessionStore?: SessionStore };

/** No query or session creation at import/page-view time. One store across route bundles and HMR. */
export function getSessionStore(): SessionStore {
  if (!globalStore.budgetBuddySessionStore) {
    globalStore.budgetBuddySessionStore = process.env.DATABASE_URL
      ? new PrismaSessionStore(new PrismaClient({
          adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
        }))
      : new ValidatedMemoryStore();
  }
  return globalStore.budgetBuddySessionStore;
}

export const sessionStore: SessionStore = {
  create: () => getSessionStore().create(),
  findByToken: (token) => getSessionStore().findByToken(token),
  appendTurn: (id, messages, plan) => getSessionStore().appendTurn(id, messages, plan),
  updatePlan: (id, plan) => getSessionStore().updatePlan(id, plan),
  save: (id, contact) => getSessionStore().save(id, contact),
};
