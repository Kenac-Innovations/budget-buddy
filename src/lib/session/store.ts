import { randomBytes } from "node:crypto";
import { emptyPlan, type Plan } from "@/lib/plan/types";

/**
 * Session store contract. The advisor (T1) depends only on this interface; T3 provides the
 * Prisma implementation. The in-memory store is for tests and local development.
 */

export interface ContactDetails {
  name: string;
  email: string;
  organisation: string;
  role: string;
  consentEmail: boolean;
  consentContact: boolean;
}

export interface AdvisorSessionRecord {
  id: string;
  token: string;
  /** Model conversation history in the provider's message format; append-only. */
  messages: unknown[];
  plan: Plan;
  contact: ContactDetails | null;
  savedAt: Date | null;
}

export interface SessionStore {
  create(): Promise<AdvisorSessionRecord>;
  findByToken(token: string): Promise<AdvisorSessionRecord | null>;
  /** Appends messages and replaces the plan. Rejects if the plan version went backwards. */
  appendTurn(id: string, newMessages: unknown[], plan: Plan): Promise<void>;
  updatePlan(id: string, plan: Plan): Promise<void>;
  save(id: string, contact: ContactDetails): Promise<void>;
}

export const SESSION_COOKIE = "bb_session";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, AdvisorSessionRecord>();

  async create() {
    const s: AdvisorSessionRecord = {
      id: newToken().slice(0, 16),
      token: newToken(),
      messages: [],
      plan: emptyPlan(),
      contact: null,
      savedAt: null,
    };
    this.sessions.set(s.id, s);
    return structuredClone(s);
  }

  async findByToken(token: string) {
    for (const s of this.sessions.values()) if (s.token === token) return structuredClone(s);
    return null;
  }

  async appendTurn(id: string, newMessages: unknown[], plan: Plan) {
    const s = this.get(id);
    if (plan.version < s.plan.version) throw new Error("Plan version went backwards");
    s.messages.push(...newMessages);
    s.plan = plan;
  }

  async updatePlan(id: string, plan: Plan) {
    const s = this.get(id);
    if (plan.version < s.plan.version) throw new Error("Plan version went backwards");
    s.plan = plan;
  }

  async save(id: string, contact: ContactDetails) {
    const s = this.get(id);
    s.contact = contact;
    s.savedAt = new Date();
  }

  private get(id: string) {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`No session ${id}`);
    return s;
  }
}
