import { isIP } from "node:net";
import { z } from "zod";

export const MAX_JSON_BYTES = 16 * 1024;
const lengthSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().safe().nonnegative());

export function clientIp(headers: Headers, trustedHeader?: "x-real-ip" | "x-forwarded-for") {
  if (!trustedHeader) return "unknown";
  const value = headers.get(trustedHeader)?.split(",")[0]?.trim();
  return value && isIP(value) ? value : "unknown";
}

/** Count bytes, including chunked bodies, before a route can parse JSON. */
export async function checkJsonBody(request: Request): Promise<400 | 413 | 415 | 408 | null> {
  if (!request.body) return null;
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  const rawLength = request.headers.get("content-length");
  if (rawLength !== null) {
    const length = lengthSchema.safeParse(rawLength);
    if (!length.success || length.data > MAX_JSON_BYTES) return 413;
  }
  const reader = request.clone().body!.getReader();
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<408>((resolve) => { timer = setTimeout(() => resolve(408), 5000); });
  try {
    const reading = (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return null;
        // Next can expose an empty stream for a bodyless DELETE. Reject a
        // non-JSON type only when bytes actually arrive.
        if (value.byteLength && type !== "application/json") return 415 as const;
        size += value.byteLength;
        if (size > MAX_JSON_BYTES) return 413 as const;
      }
    })();
    return await Promise.race([reading, deadline]);
  } catch {
    return 400;
  } finally {
    clearTimeout(timer);
    // Cancelling a tee branch can await the other branch: never block on it.
    void reader.cancel().catch(() => {});
  }
}
