import { expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { InMemorySessionStore, SESSION_COOKIE } from "../session/store";
import { PAUSE_MESSAGE } from "./rate-limit";

it("returns calm 429 responses, Retry-After and security headers", async () => {
  const session = await new InMemorySessionStore().create();
  const request = () => new NextRequest("http://localhost/api/advisor/turn", { method: "POST", body: "{}", headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${session.token}` } });
  for (let i = 0; i < 20; i++) expect((await proxy(request())).status).toBe(200);
  const response = await proxy(request());
  expect(response.status).toBe(429);
  expect(await response.json()).toEqual({ error: PAUSE_MESSAGE });
  expect(response.headers.get("Retry-After")).toBeTruthy();
  expect(response.headers.get("X-Frame-Options")).toBe("DENY");
});
it("rejects oversized and cross-origin mutation requests", async () => {
  const large = await proxy(new NextRequest("http://localhost/api/plan/op", { method: "POST", body: "x".repeat(17000), headers: { "content-type": "application/json" } }));
  expect(large.status).toBe(413);
  const crossSite = await proxy(new NextRequest("http://localhost/api/plan/op", { method: "POST", body: "{}", headers: { "content-type": "application/json", origin: "https://attacker.org" } }));
  expect(crossSite.status).toBe(403);
});
it("sets unique CSP nonces and prevents caching session pages", async () => {
  const one = await proxy(new NextRequest("http://localhost/privacy"));
  const two = await proxy(new NextRequest("http://localhost/privacy"));
  expect(one.headers.get("Content-Security-Policy")).not.toBe(two.headers.get("Content-Security-Policy"));
  expect(one.headers.get("Cache-Control")).toBe("private, no-store");
});

it("limits save and private return paths and suppresses bearer referrers", async () => {
  for (let i = 0; i < 10; i++) {
    const response = await proxy(new NextRequest("http://localhost/api/session/save", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(200);
  }
  const blocked = await proxy(new NextRequest("http://localhost/r/private-token"));
  expect(blocked.status).toBe(429);
  expect(blocked.headers.get("Referrer-Policy")).toBe("no-referrer");
  expect(await blocked.json()).toEqual({ error: PAUSE_MESSAGE });
});
