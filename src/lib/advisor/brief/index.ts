import { readFileSync } from "node:fs";
import { join } from "node:path";

export const TOPIC_FILES = ["01-power.md", "02-connectivity.md", "03-usd-saas.md", "04-licence-control.md",
  "05-endpoints.md", "06-recovery.md", "07-security.md", "08-ai-pilots.md", "09-sdwan.md",
  "10-data-protection.md", "11-procurement.md", "12-hosting.md"] as const;

let cached: string | undefined;
/** Static, dated files only: no web retrieval or filesystem reads in the per-round hot path. */
export function getTrendBrief(): string {
  return cached ??= TOPIC_FILES.map((file) => readFileSync(join(process.cwd(), "src/lib/advisor/brief", file), "utf8")).join("\n\n---\n\n");
}
