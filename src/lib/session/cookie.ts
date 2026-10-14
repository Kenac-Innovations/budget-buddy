import { cookies } from "next/headers";
import { sessionStore } from "./index";
import { SessionToken } from "./prisma-store";
import { SESSION_COOKIE, type SessionStore } from "./store";

export function sessionCookieOptions() {
  return {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const, path: "/", maxAge: 30 * 24 * 60 * 60,
  };
}

export async function readSessionCookie() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const result = SessionToken.safeParse(value);
  return result.success ? result.data : null;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, SessionToken.parse(token), sessionCookieOptions());
}

export async function getSession(store: SessionStore = sessionStore) {
  const token = await readSessionCookie();
  return token ? store.findByToken(token) : null;
}

/** T1 calls this only after validating the first user message, before streaming. */
export async function getOrCreate(store: SessionStore = sessionStore) {
  const current = await getSession(store);
  if (current) return current;
  const session = await store.create();
  await setSessionCookie(session.token);
  return session;
}

export const getOrCreateSession = getOrCreate;
