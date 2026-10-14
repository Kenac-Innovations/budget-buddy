import { createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

const hashKey = randomBytes(32);
const logSchema = z.object({
  event: z.enum(["request_rejected", "health_checked", "retention_completed", "retention_failed", "session_saved", "session_deleted", "advisor_completed", "request_completed", "request_failed"]),
  sessionId: z.string().max(256).optional(),
  route: z.enum(["/api/advisor/turn", "/api/session/save", "/api/session", "/api/plan/op", "/api/health", "/api/export/xlsx", "/api/share", "/r/[token]", "retention", "other"]).optional(),
  status: z.number().int().min(100).max(599).optional(),
  ms: z.number().finite().nonnegative().optional(),
});

/** Allowlist rather than recursive blacklist: nested data and error messages never escape. */
export function redact(input: unknown): z.infer<typeof logSchema> {
  const result = logSchema.safeParse(input);
  if (!result.success) return { event: "request_failed" };
  const { sessionId, ...safe } = result.data;
  return sessionId ? { ...safe, sessionId: createHmac("sha256", hashKey).update(sessionId).digest("hex") } : safe;
}

export function log(input: unknown) {
  process.stdout.write(`${JSON.stringify(redact(input))}\n`);
}
