import { describe, expect, it } from "vitest";
import { advisorIpLimit, RateLimiter, routeLimits } from "./rate-limit";

describe("abuse limits", () => {
  it("enforces 20 turns per session with independent sessions", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 20; i++) expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", "one"), 1000).allowed).toBe(true);
    expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", "one"), 1000)).toEqual({ allowed: false, retryAfter: 600 });
    expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", "two"), 1000).allowed).toBe(true);
    expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", "one"), 601000).allowed).toBe(true);
  });
  it("enforces 60 per IP even when session cookies rotate", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 60; i++) expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", `s${i}`), 0).allowed).toBe(true);
    expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "ip", "another"), 0).allowed).toBe(false);
    expect(limiter.consume(routeLimits("/api/advisor/turn", "POST", "different", "another"), 0).allowed).toBe(true);
  });
  it("limits save and private return requests to 10, including anonymous turns", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) expect(limiter.consume(routeLimits("/api/session/save", "POST", "ip"), 0).allowed).toBe(true);
    expect(limiter.consume(routeLimits("/r/private-link", "GET", "ip"), 0).allowed).toBe(false);
    expect(routeLimits("/api/advisor/turn", "POST", "ip")[1].limit).toBe(20);
    expect(routeLimits("/privacy", "GET", "ip")).toEqual([]);
  });
  it("bounds attacker-controlled keys without evicting active limits", () => {
    const limiter = new RateLimiter(1);
    expect(limiter.consume([{ key: "one", limit: 1 }], 0).allowed).toBe(true);
    expect(limiter.consume([{ key: "two", limit: 1 }], 0).allowed).toBe(false);
    expect(limiter.consume([{ key: "one", limit: 1 }], 0).allowed).toBe(false);
    expect(limiter.consume([{ key: "two", limit: 1 }], 600000).allowed).toBe(true);
  });
});

describe("advisor IP limit override", () => {
  it("defaults to 60", () => {
    expect(advisorIpLimit({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(60);
  });
  it("can be raised outside production for eval runs", () => {
    expect(advisorIpLimit({ NODE_ENV: "development", ADVISOR_IP_TURN_LIMIT: "400" } as NodeJS.ProcessEnv)).toBe(400);
  });
  it("is ignored in production", () => {
    expect(advisorIpLimit({ NODE_ENV: "production", ADVISOR_IP_TURN_LIMIT: "400" } as NodeJS.ProcessEnv)).toBe(60);
  });
});
