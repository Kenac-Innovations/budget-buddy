import "dotenv/config";
import { Pool } from "pg";
import { env } from "../src/lib/env";
import { log } from "../src/lib/log";
import { deleteExpiredSessions } from "../src/lib/security/retention";

async function main() {
  if (!env.DATABASE_URL) throw new Error("Database not configured");
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, query_timeout: 30_000 });
  try {
    const count = await deleteExpiredSessions(pool);
    log({ event: "retention_completed", route: "retention" });
    process.stdout.write(`${JSON.stringify({ deleted: count })}\n`);
  } finally { await pool.end(); }
}
main().catch(() => { log({ event: "retention_failed", route: "retention" }); process.exitCode = 1; });
