import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";
const token = "k".repeat(43);
function request(value = token, origin = "http://localhost") {
  return new Request("http://localhost/kenac/login", { method: "POST", headers: { origin }, body: new URLSearchParams({ token: value }) });
}
afterEach(() => vi.unstubAllEnvs());
it("sets an httpOnly signed cookie after one login and never reflects the token", async () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  const response = await POST(request());
  expect(response.status).toBe(303);
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toMatch(/HttpOnly/i);
  expect(cookie).toContain("Path=/kenac");
  expect(cookie).toMatch(/SameSite=strict/i);
  expect(cookie).not.toContain(token);
});
it("rejects wrong tokens and cross-origin login", async () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  expect((await POST(request("wrong"))).status).toBe(401);
  expect((await POST(request(token, "https://attacker.test"))).status).toBe(403);
});
it("bounds URL-encoded bodies even without Content-Length", async () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  const oversized = new Request("http://localhost/kenac/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/x-www-form-urlencoded" }, body: "token=" + "a".repeat(4096) });
  expect((await POST(oversized)).status).toBe(413);
});
it("requires HTTPS-only cookies in production and can sign out", async () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  vi.stubEnv("NODE_ENV", "production");
  expect((await POST(request())).headers.get("set-cookie")).toContain("Secure");
  const logout = new Request("http://localhost/kenac/login", { method: "POST", headers: { origin: "http://localhost" }, body: new URLSearchParams({ action: "logout" }) });
  expect((await POST(logout)).headers.get("set-cookie")).toContain("Max-Age=0");
});
