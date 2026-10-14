import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InMemorySessionStore, SESSION_COOKIE } from "./store";
const jar = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
import { getOrCreate, getSession, readSessionCookie, sessionCookieOptions, setSessionCookie } from "./cookie";
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.unstubAllEnvs(); });

it("never creates a session on a cookie read; creates once on the first reply", async () => {
  const store = new InMemorySessionStore();
  const create = vi.spyOn(store, "create");
  jar.get.mockReturnValue(undefined);
  expect(await getSession(store)).toBeNull();
  expect(create).not.toHaveBeenCalled();
  const first = await getOrCreate(store);
  expect(create).toHaveBeenCalledTimes(1);
  expect(jar.set).toHaveBeenCalledWith(SESSION_COOKIE, first.token, expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 2592000 }));
  jar.get.mockReturnValue({ value: first.token });
  expect((await getOrCreate(store)).id).toBe(first.id);
  expect(create).toHaveBeenCalledTimes(1);
});

it("ignores invalid/stale cookies, validates writes and secures production cookies", async () => {
  jar.get.mockReturnValue({ value: "invalid" });
  expect(await readSessionCookie()).toBeNull();
  await expect(setSessionCookie("invalid")).rejects.toThrow();
  vi.stubEnv("NODE_ENV", "production");
  expect(sessionCookieOptions().secure).toBe(true);
  vi.stubEnv("NODE_ENV", "development");
  expect(sessionCookieOptions().secure).toBe(false);
  const store = new InMemorySessionStore();
  jar.get.mockReturnValue({ value: "a".repeat(43) });
  expect((await getOrCreate(store)).token).not.toBe("a".repeat(43));
});
