import { afterEach, expect, it, vi } from "vitest";
import { authorisedKenac, createKenacCookie, KENAC_COOKIE, LOGIN_MAX_AGE, validKenacToken } from "./kenac-auth";

afterEach(() => vi.unstubAllEnvs());
const token = "a".repeat(43);
const request = (headers: Record<string, string> = {}) => new Request("http://localhost/kenac", { headers });
it("fails closed for missing, short or wrong tokens; accepts bearer headers only", () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", "");
  expect(authorisedKenac(request())).toBe(false);
  expect(validKenacToken("")).toBe(false);
  expect(() => createKenacCookie()).toThrow();
  vi.stubEnv("KENAC_VIEW_TOKEN", "short");
  expect(validKenacToken("short")).toBe(false);
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  expect(authorisedKenac(request({ authorization: `Bearer ${token}` }))).toBe(true);
  expect(authorisedKenac(new Request(`http://localhost/kenac?token=${token}`))).toBe(false);
  expect(authorisedKenac(request({ authorization: "Bearer wrong" }))).toBe(false);
});
it("sets signed expiring sessions and rejects tampering, expiry and token rotation", () => {
  vi.stubEnv("KENAC_VIEW_TOKEN", token);
  const now = Date.parse("2026-10-14T12:00:00Z");
  const cookie = createKenacCookie(now);
  expect(cookie).not.toContain(token);
  expect(authorisedKenac(request({ cookie: `${KENAC_COOKIE}=${cookie}` }), now)).toBe(true);
  expect(authorisedKenac(request({ cookie: `${KENAC_COOKIE}=${cookie}x` }), now)).toBe(false);
  expect(authorisedKenac(request({ cookie: `${KENAC_COOKIE}=${cookie}` }), now + LOGIN_MAX_AGE * 1000)).toBe(false);
  vi.stubEnv("KENAC_VIEW_TOKEN", "b".repeat(43));
  expect(authorisedKenac(request({ cookie: `${KENAC_COOKIE}=${cookie}` }), now)).toBe(false);
});
