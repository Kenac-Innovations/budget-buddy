import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";
import { Plan } from "@/lib/plan/types";
import { sessionStore } from "@/lib/session";
import { ContactInput } from "@/lib/session/prisma-store";
import type { AdvisorSessionRecord } from "@/lib/session/store";
import { sharedRows, type SharedRow } from "./sharing";

const Change = z.object({ lineId: z.string(), shared: z.boolean(), allocation: z.boolean() });
type Change = z.infer<typeof Change>;
type Entry = { token: string; changes: Map<string, { change: Change; at: string }> };
const state = globalThis as typeof globalThis & { budgetBuddySharing?: Map<string, Entry>; budgetBuddySharingPrisma?: PrismaClient };
const memory = state.budgetBuddySharing ??= new Map();
function db() {
  if (!process.env.DATABASE_URL) return null;
  return state.budgetBuddySharingPrisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}

/** No plan mutations. Persist consent dates in existing audit storage without extending contracts. */
export async function recordSharing(session: AdvisorSessionRecord): Promise<Record<string, string>> {
  if (!session.savedAt || !session.contact) return {};
  const plan = Plan.parse(session.plan);
  const client = db();
  const previous = new Map<string, { change: Change; at: string }>();
  if (client) {
    const events = await client.auditEvent.findMany({ where: { entity: "AdvisorSession", entityId: session.id, action: "kenac_sharing" }, orderBy: { at: "asc" } });
    for (const event of events) {
      const parsed = Change.safeParse(event.after);
      if (parsed.success) previous.set(parsed.data.lineId, { change: parsed.data, at: event.at.toISOString() });
    }
  } else {
    for (const [id, change] of memory.get(session.id)?.changes ?? []) previous.set(id, change);
  }
  const at = new Date();
  for (const line of plan.lines) {
    const change = Change.parse({ lineId: line.id, shared: line.state === "accepted" && line.sharedWithKenac, allocation: line.shareAllocation });
    const old = previous.get(line.id);
    if ((!old && !change.shared) || (old && old.change.shared === change.shared && old.change.allocation === change.allocation)) continue;
    if (client) await client.auditEvent.create({ data: { entity: "AdvisorSession", entityId: session.id, action: "kenac_sharing", after: change, at } });
    previous.set(line.id, { change, at: at.toISOString() });
  }
  if (!client) memory.set(session.id, { token: session.token, changes: previous });
  return Object.fromEntries([...previous].filter(([, v]) => v.change.shared).map(([id, v]) => [id, v.at]));
}

/** Always re-read live consent: a cached share snapshot can never keep a revoked line visible. */
export async function listSharedRows(): Promise<SharedRow[]> {
  const client = db();
  const rows: SharedRow[] = [];
  if (client) {
    const sessions = await client.advisorSession.findMany({
      where: { savedAt: { not: null } },
      select: { id: true, plan: true, consentContact: true, consentEmail: true, contactName: true, contactEmail: true, organisation: true, role: true },
      orderBy: { savedAt: "desc" },
    });
    for (const session of sessions) {
      const plan = Plan.parse(session.plan);
      if (!plan.lines.some((l) => l.sharedWithKenac && l.state === "accepted")) continue;
      const events = await client.auditEvent.findMany({ where: { entity: "AdvisorSession", entityId: session.id, action: "kenac_sharing" }, orderBy: { at: "asc" } });
      const dates: Record<string, string> = {};
      for (const event of events) {
        const parsed = Change.safeParse(event.after);
        if (parsed.success && parsed.data.shared) dates[parsed.data.lineId] = event.at.toISOString();
      }
      const contact = session.consentContact ? ContactInput.parse({ name: session.contactName, email: session.contactEmail, organisation: session.organisation, role: session.role, consentEmail: session.consentEmail, consentContact: true }) : null;
      rows.push(...sharedRows(plan, contact, dates));
    }
  } else {
    for (const entry of memory.values()) {
      const session = await sessionStore.findByToken(entry.token);
      if (!session?.savedAt) continue;
      rows.push(...sharedRows(session.plan, session.contact, Object.fromEntries([...entry.changes].filter(([, v]) => v.change.shared).map(([id, v]) => [id, v.at]))));
    }
  }
  return rows;
}
