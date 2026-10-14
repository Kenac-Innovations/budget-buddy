import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const KENAC_COOKIE = "bb_kenac_view";
const ConfigToken = z.string().min(32).max(512).regex(/^[A-Za-z0-9_-]+$/);
export const LOGIN_MAX_AGE = 8 * 60 * 60;
const hash = (value: string) => createHash("sha256").update(value).digest();
const equal = (a: string, b: string) => timingSafeEqual(hash(a), hash(b));
function secret(): string | null {
  const parsed = ConfigToken.safeParse(process.env.KENAC_VIEW_TOKEN);
  return parsed.success ? parsed.data : null;
}
export function validKenacToken(token: unknown): boolean {
  const key = secret();
  const parsed = z.string().max(512).safeParse(token);
  return Boolean(key && parsed.success && equal(parsed.data, key));
}
export function createKenacCookie(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("Kenac view is not configured");
  const expires = String(Math.floor(now / 1000) + LOGIN_MAX_AGE);
  return `${expires}.${createHmac("sha256", key).update(`kenac-view:${expires}`).digest("base64url")}`;
}
export function authorisedKenac(request: Request, now = Date.now()): boolean {
  const key = secret();
  if (!key) return false;
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{1,512})$/)?.[1];
  if (bearer && validKenacToken(bearer)) return true;
  const cookie = request.headers.get("cookie")?.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${KENAC_COOKIE}=`))?.slice(KENAC_COOKIE.length + 1);
  const parsed = z.string().regex(/^\d{10}\.[A-Za-z0-9_-]{43}$/).safeParse(cookie);
  if (!parsed.success) return false;
  const [expires, signature] = parsed.data.split(".");
  const seconds = Math.floor(now / 1000);
  if (Number(expires) <= seconds || Number(expires) > seconds + LOGIN_MAX_AGE) return false;
  return equal(signature, createHmac("sha256", key).update(`kenac-view:${expires}`).digest("base64url"));
}
