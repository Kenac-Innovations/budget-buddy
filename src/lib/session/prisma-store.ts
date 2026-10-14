import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { PrismaClient, type Prisma, type AdvisorSession } from "@/generated/prisma/client";
import { Plan, Role, emptyPlan } from "@/lib/plan/types";
import { newToken, type AdvisorSessionRecord, type ContactDetails, type SessionStore } from "./store";

export const ContactInput = z.object({
  name: z.string().trim().min(1).max(120).regex(/^[^\r\n]*$/),
  email: z.string().trim().email().max(254),
  organisation: z.string().trim().min(1).max(160).regex(/^[^\r\n]*$/),
  role: Role,
  consentEmail: z.literal(true),
  consentContact: z.boolean().default(false),
}).strict();

export const SessionToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const SessionMessages = z.array(z.json());
export const UNSAVED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export class PlanVersionConflict extends Error {
  constructor() {
    super("The plan changed. Reload it and try again.");
    this.name = "PlanVersionConflict";
  }
}

export function checkPlanVersion(current: Plan, next: Plan) {
  if (next.version < current.version ||
    (next.version === current.version && !isDeepStrictEqual(
      JSON.parse(JSON.stringify(current)), JSON.parse(JSON.stringify(next)),
    ))) throw new PlanVersionConflict();
}

function record(row: AdvisorSession): AdvisorSessionRecord {
  const plan = Plan.parse(row.plan);
  if (plan.version !== row.planVersion) throw new Error("Invalid stored plan version");
  return {
    id: row.id,
    token: SessionToken.parse(row.token),
    plan,
    messages: SessionMessages.parse(row.messages),
    savedAt: row.savedAt,
    contact: row.savedAt ? ContactInput.parse({
      name: row.contactName, email: row.contactEmail, organisation: row.organisation,
      role: row.role, consentEmail: row.consentEmail, consentContact: row.consentContact,
    }) : null,
  };
}

/** Row locks protect transcript appends; the version check protects a stale caller's plan. */
export class PrismaSessionStore implements SessionStore {
  constructor(private readonly prisma: PrismaClient) {}

  async checkConnection() {
    // Check the migrated table as well as connectivity before choosing storage.
    await this.prisma.advisorSession.findFirst({ select: { id: true } });
  }

  async deleteByToken(input: string) {
    const token = SessionToken.parse(input);
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.advisorSession.findUnique({ where: { token }, select: { id: true } });
      if (!session) return;
      await tx.$queryRaw`SELECT "id" FROM "AdvisorSession" WHERE "id" = ${session.id} FOR UPDATE`;
      await tx.auditEvent.deleteMany({ where: { entity: "AdvisorSession", entityId: session.id } });
      await tx.advisorSession.deleteMany({ where: { id: session.id, token } });
    });
  }

  async create() {
    const plan = Plan.parse(emptyPlan());
    return record(await this.prisma.advisorSession.create({
      data: { token: newToken(), plan, planVersion: plan.version, messages: [] },
    }));
  }

  async findByToken(token: string) {
    if (!SessionToken.safeParse(token).success) return null;
    const row = await this.prisma.advisorSession.findUnique({ where: { token } });
    if (!row || (!row.savedAt && row.updatedAt.getTime() <= Date.now() - UNSAVED_MAX_AGE_MS)) return null;
    return record(row);
  }

  async appendTurn(id: string, newMessages: unknown[], input: Plan) {
    const plan = Plan.parse(input);
    const messages = SessionMessages.parse(newMessages);
    await this.write(id, plan, messages as Prisma.InputJsonValue[]);
  }

  async updatePlan(id: string, input: Plan) {
    await this.write(id, Plan.parse(input));
  }

  private async write(id: string, plan: Plan, messages?: Prisma.InputJsonValue[]) {
    await this.prisma.$transaction(async (tx) => {
      // Tagged parameters keep the session id out of SQL text.
      await tx.$queryRaw`SELECT "id" FROM "AdvisorSession" WHERE "id" = ${id} FOR UPDATE`;
      const current = record(await tx.advisorSession.findUniqueOrThrow({ where: { id } }));
      checkPlanVersion(current.plan, plan);
      await tx.advisorSession.update({
        where: { id },
        data: {
          plan, planVersion: plan.version,
          ...(messages ? { messages: [...current.messages, ...messages] as Prisma.InputJsonValue[] } : {}),
        },
      });
    });
  }

  async save(id: string, input: ContactDetails) {
    const contact = ContactInput.parse(input);
    await this.prisma.advisorSession.update({
      where: { id },
      data: {
        contactName: contact.name, contactEmail: contact.email, organisation: contact.organisation,
        role: contact.role, consentEmail: contact.consentEmail, consentContact: contact.consentContact,
        savedAt: new Date(),
      },
    });
  }
}
