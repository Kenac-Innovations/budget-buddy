import { afterEach, expect, it, vi } from "vitest";
import { InMemorySessionStore } from "@/lib/session/store";
import { getSessionStore, registerSessionStore } from "./session-store";

afterEach(() => vi.unstubAllEnvs());
it("reuses the memory instance and swaps to a registered integration store by env", async () => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("SESSION_STORE", "memory");
  const store = await getSessionStore();
  const session = await store.create();
  expect(await (await getSessionStore()).findByToken(session.token)).toEqual(session);
  const other = new InMemorySessionStore();
  registerSessionStore("test", () => other);
  vi.stubEnv("SESSION_STORE", "test");
  expect(await getSessionStore()).toBe(other);
  vi.stubEnv("SESSION_STORE", "missing");
  await expect(getSessionStore()).rejects.toThrow("not registered");
  expect(() => registerSessionStore("memory", () => other)).toThrow("reserved");
});
