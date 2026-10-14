import { afterEach, expect, it, vi } from "vitest";
import { exportDemoPlan } from "@/lib/export/fixtures";
import { GET } from "./route";

const getSession = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session/cookie", () => ({ getSession }));
afterEach(() => vi.resetAllMocks());
it("requires a private session and never caches errors", async () => {
  getSession.mockResolvedValue(null);
  const response = await GET();
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("returns a named XLSX download with the session's accepted plan", async () => {
  getSession.mockResolvedValue({ plan: exportDemoPlan(), savedAt: null, contact: null });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toContain("ICT-plan-2027.xlsx");
  expect(response.headers.get("content-type")).toContain("spreadsheetml.sheet");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 2)]).toEqual([80, 75]);
});
it("returns a calm failure without database details", async () => {
  getSession.mockRejectedValue(new Error("secret database connection"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret");
});
