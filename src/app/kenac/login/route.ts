import { NextResponse } from "next/server";
import { z } from "zod";
import { createKenacCookie, KENAC_COOKIE, LOGIN_MAX_AGE, validKenacToken } from "@/lib/export/kenac-auth";
import { RateLimiter } from "@/lib/security/rate-limit";
import { kenacHtml } from "../view";

const limiter = new RateLimiter();
const Login = z.object({ token: z.string().min(1).max(512) }).strict();
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "Content-Type": "text/html; charset=utf-8" };
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(process.env.APP_URL ?? request.url).origin) return new Response("Open the Kenac login here to continue.", { status: 403, headers });
  if (Number(request.headers.get("content-length")) > 2048) return new Response("Access token is too long.", { status: 413, headers });
  if (request.headers.get("content-type")?.split(";")[0] !== "application/x-www-form-urlencoded") return new Response("Use the access token form to continue.", { status: 415, headers });
  // Native HTML forms are outside /api's JSON-body guard. Bound chunked bodies here too.
  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  try {
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) return new Response("Access token is too long.", { status: 413, headers });
      body += decoder.decode(value, { stream: true });
    }
  } catch { return new Response("Check the access token and try again.", { status: 400, headers }); }
  finally { void reader?.cancel().catch(() => {}); }
  const form = new URLSearchParams(body + decoder.decode());
  if (form?.get("action") === "logout") {
    const response = NextResponse.redirect(new URL("/kenac", request.url), 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(KENAC_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/kenac", maxAge: 0 });
    return response;
  }
  const allowed = limiter.consume([{ key: "kenac-login", limit: 20 }]);
  if (!allowed.allowed) return new Response("Too many login attempts. Try again in a few minutes.", { status: 429, headers: { ...headers, "Retry-After": String(allowed.retryAfter) } });
  const parsed = Login.safeParse(form ? Object.fromEntries(form.entries()) : null);
  if (!parsed.success || !validKenacToken(parsed.data.token)) return new Response(kenacHtml(null, request.headers.get("x-nonce") ?? "", "Check the access token and try again."), { status: 401, headers });
  const response = NextResponse.redirect(new URL("/kenac", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(KENAC_COOKIE, createKenacCookie(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/kenac", maxAge: LOGIN_MAX_AGE });
  return response;
}
