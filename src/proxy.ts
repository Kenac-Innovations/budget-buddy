import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session/store";
import { log } from "@/lib/log";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security/headers";
import { PAUSE_MESSAGE, RateLimiter, routeLimits } from "@/lib/security/rate-limit";
import { checkJsonBody, clientIp } from "@/lib/security/request";

const limiter = new RateLimiter();
export async function proxy(request: NextRequest) {
  const start = Date.now();
  const path = request.nextUrl.pathname;
  const nonce = randomBytes(32).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const finish = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    for (const { key, value } of securityHeaders) response.headers.set(key, value);
    response.headers.set("Cache-Control", "private, no-store");
    if (path.startsWith("/r/")) response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const reject = (status: number, error: string, retryAfter?: number) => {
    // Return paths contain credentials: never log a raw pathname or cookie.
    log({ event: "request_rejected", route: path.startsWith("/r/") ? "/r/[token]" : path.startsWith("/api/advisor/") ? "/api/advisor/turn" : "other", status, ms: Date.now() - start });
    return finish(NextResponse.json({ error }, { status, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }));
  };
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value;
  const session = rawSession && /^[A-Za-z0-9_-]{43}$/.test(rawSession) ? rawSession : undefined;
  const limits = routeLimits(path, request.method, clientIp(request.headers, env.TRUSTED_IP_HEADER), session);
  if (limits.length) {
    const result = limiter.consume(limits);
    if (!result.allowed) return reject(429, PAUSE_MESSAGE, result.retryAfter);
  }
  if (path.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(env.APP_URL ?? request.url).origin) return reject(403, "Open your plan here to make changes.");
    const bodyError = await checkJsonBody(request);
    if (bodyError) return reject(bodyError, bodyError === 413 ? "Keep your message under 16 KB and try again." : bodyError === 408 ? "The request took too long. Try again." : bodyError === 400 ? "The request could not be read. Try again." : "Send this request as JSON.");
  }
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  return finish(NextResponse.next({ request: { headers } }));
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
