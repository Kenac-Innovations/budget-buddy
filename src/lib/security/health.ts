import { z } from "zod";

const healthSchema = z.object({ ok: z.boolean(), db: z.enum(["up", "down"]), model: z.enum(["configured", "missing"]) });
export async function healthStatus(checkDatabase: () => Promise<unknown>, mode: "demo" | "live", key?: string) {
  let db: "up" | "down" = "down";
  try { await checkDatabase(); db = "up"; } catch { /* Never expose database errors. */ }
  const model = key ? "configured" : "missing";
  return healthSchema.parse({ ok: mode === "demo" || (db === "up" && model === "configured"), db, model });
}
