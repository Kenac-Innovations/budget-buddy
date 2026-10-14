import { Pool } from "pg";
import { env } from "@/lib/env";
import { healthStatus } from "@/lib/security/health";

const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 2000, query_timeout: 2000 }) : null;
export async function GET(request: Request) {
  const status = await healthStatus(async () => {
    if (!pool) throw new Error("Database not configured");
    await pool.query("SELECT 1");
  }, env.ADVISOR_MODE, env.OPENAI_API_KEY);
  // Liveness tests the process; readiness tests its dependencies. Do not restart on DB outages.
  const liveness = new URL(request.url).searchParams.get("probe") === "liveness";
  return Response.json(status, { status: status.ok || liveness ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
