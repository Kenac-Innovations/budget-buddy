import { createHash } from "node:crypto";

export const PAUSE_MESSAGE = "Let's pause for a moment. Try again in a few minutes.";
const WINDOW_MS = 10 * 60 * 1000;
type Bucket = { count: number; expires: number };

/** Fixed windows, bounded memory, no raw IPs or bearer tokens retained. */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  constructor(private readonly capacity = 20_000) {}

  consume(limits: { key: string; limit: number }[], now = Date.now()) {
    for (const [key, bucket] of this.buckets) if (bucket.expires <= now) this.buckets.delete(key);
    const hashed = limits.map(({ key, limit }) => ({ key: createHash("sha256").update(key).digest("hex"), limit }));
    const blocked = hashed.find(({ key, limit }) => (this.buckets.get(key)?.count ?? 0) >= limit);
    if (blocked) return { allowed: false, retryAfter: Math.max(1, Math.ceil((this.buckets.get(blocked.key)!.expires - now) / 1000)) };
    const newKeys = hashed.filter(({ key }) => !this.buckets.has(key)).length;
    if (this.buckets.size + newKeys > this.capacity) return { allowed: false, retryAfter: 600 };
    for (const { key } of hashed) {
      const bucket = this.buckets.get(key) ?? { count: 0, expires: now + WINDOW_MS };
      bucket.count += 1;
      this.buckets.set(key, bucket);
    }
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Per-IP advisor turn limit. ADVISOR_IP_TURN_LIMIT raises it for local eval runs (many synthetic
 * sessions from one machine); it is ignored in production so the live limit cannot be loosened.
 */
export function advisorIpLimit(env: NodeJS.ProcessEnv = process.env): number {
  if (env.NODE_ENV === "production") return 60;
  const override = Number(env.ADVISOR_IP_TURN_LIMIT);
  return Number.isInteger(override) && override > 0 ? override : 60;
}

export function routeLimits(path: string, method: string, ip: string, session?: string) {
  if (path === "/api/advisor/turn" && method === "POST") return [
    { key: `advisor:ip:${ip}`, limit: advisorIpLimit() },
    { key: `advisor:session:${session ?? `anonymous:${ip}`}`, limit: 20 },
  ];
  if ((path === "/api/session/save" && method === "POST") || path.startsWith("/r/")) {
    return [{ key: `save-return:ip:${ip}`, limit: 10 }];
  }
  return [];
}
