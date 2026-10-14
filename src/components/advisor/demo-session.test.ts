import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), remove: vi.fn(), cookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: mocks.cookie }) }));
vi.mock("@/app/api/session/route", () => ({ DELETE: mocks.remove }));
vi.mock("@/lib/session/cookie", () => ({ getSession: mocks.session, sessionCookieOptions: () => ({ httpOnly: true, path: "/" }) }));
import { resetDemoSession } from "./demo-session";

afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs(); });
it("refuses a reset in live mode before reading or deleting a session", async () => {
  vi.stubEnv("ADVISOR_MODE", "live");
  expect(await resetDemoSession()).toBe(false);
  expect(mocks.session).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it("clears a disposable demo session through the existing deletion and HttpOnly-cookie path", async () => {
  vi.stubEnv("ADVISOR_MODE", "demo");
  mocks.session.mockResolvedValue({ savedAt: null });
  mocks.remove.mockResolvedValue(new Response(null, { status: 204 }));
  expect(await resetDemoSession()).toBe(true);
  expect(mocks.remove).toHaveBeenCalledOnce();
});
it("detaches saved plans while preserving their data and return links", async () => {
  vi.stubEnv("ADVISOR_MODE", "demo");
  mocks.session.mockResolvedValue({ savedAt: new Date() });
  expect(await resetDemoSession()).toBe(true);
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.cookie).toHaveBeenCalledWith("bb_session", "", expect.objectContaining({ httpOnly: true, maxAge: 0 }));
});
it("reports a failed reset so the UI retains its current draft for retry", async () => {
  vi.stubEnv("ADVISOR_MODE", "demo");
  mocks.session.mockResolvedValue(null);
  mocks.remove.mockResolvedValue(new Response(null, { status: 503 }));
  expect(await resetDemoSession()).toBe(false);
});
