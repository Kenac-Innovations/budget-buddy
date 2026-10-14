import { afterEach, expect, it, vi } from "vitest";
import { InMemorySessionStore } from "@/lib/session/store";
import { exportDemoPlan } from "@/lib/export/fixtures";
import { applyOp } from "@/lib/plan/ops";
import { sharedRows, sharingCsv } from "@/lib/export/sharing";
import { POST, GET } from "./route";
import { GET as kenac } from "@/app/kenac/route";
import { GET as csv } from "@/app/kenac/csv/route";

const doubles = vi.hoisted(() => ({ getSession: vi.fn(), findByToken: vi.fn() }));
vi.mock("@/lib/session/cookie", () => ({ getSession: doubles.getSession }));
vi.mock("@/lib/session", () => ({ sessionStore: { findByToken: doubles.findByToken } }));
const confirm = () => POST(new Request("http://localhost/api/share", { method: "POST", body: "{}" }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("requires a saved owner and validates sharing confirmation bodies", async () => {
  doubles.getSession.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect((await confirm()).status).toBe(401);
  doubles.getSession.mockResolvedValue({ savedAt: null });
  expect((await GET()).status).toBe(403);
  expect((await confirm()).status).toBe(403);
  expect((await POST(new Request("http://localhost/api/share", { method: "POST", body: '{"plan":"bad"}' }))).status).toBe(400);
  expect((await POST(new Request("http://localhost/api/share", { method: "POST", body: "bad" }))).status).toBe(400);
});
it("protects HTML and CSV with real 401 responses and no sensitive content", async () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", "x".repeat(43));
  for (const handler of [kenac, csv]) {
    const response = await handler(new Request("http://localhost/kenac"));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("Firewall subscription");
  }
});
it("matches preview row for row in the protected HTML/CSV, hides private fields, and withdraws immediately", async () => {
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("KENAC_VIEW_TOKEN", "x".repeat(43));
  const log = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    const store = new InMemorySessionStore();
    doubles.findByToken.mockImplementation((token: string) => store.findByToken(token));
    const session = await store.create();
    const result = applyOp(exportDemoPlan(), { op: "set_sharing", id: "l5", shared: true }, "user");
    if (!result.ok) throw new Error(result.error);
    await store.updatePlan(session.id, result.plan);
    const contact = { name: "Private name", email: "private@example.test", organisation: "Private company", role: "CIO", consentEmail: true, consentContact: false };
    await store.save(session.id, contact);
    doubles.getSession.mockImplementation(() => store.findByToken(session.token));
    const confirmation = await confirm();
    const { rows } = await confirmation.json();
    expect(rows).toEqual(sharedRows(result.plan, contact, { l5: rows[0].sharedAt }));
    const request = () => new Request("http://localhost/kenac", { headers: { authorization: `Bearer ${"x".repeat(43)}` } });
    const html = await (await kenac(request())).text();
    expect(html).toContain(rows[0].item);
    expect(html).not.toMatch(/Private name|private@example|Private company|48000|Firewall subscription|Installation and commissioning/);
    expect(Buffer.from(await (await csv(request())).arrayBuffer()).toString("utf8")).toBe(sharingCsv(rows));
    const revoked = applyOp(result.plan, { op: "set_sharing", id: "l5", shared: false }, "user");
    if (!revoked.ok) throw new Error(revoked.error);
    await store.updatePlan(session.id, revoked.plan);
    expect(await (await kenac(request())).text()).not.toContain(rows[0].item);
    const access = log.mock.calls.map(([line]) => JSON.parse(String(line)));
    expect(access).toEqual([{ event: "kenac_view", count: 1 }, { event: "kenac_csv", count: 1 }, { event: "kenac_view", count: 0 }]);
  } finally { log.mockRestore(); }
});
