import { expect, it } from "vitest";
import { healthStatus } from "./health";
it("reports dependencies honestly, supports demo and suppresses errors", async () => {
  const unavailable = async () => { throw new Error("password=secret"); };
  expect(await healthStatus(unavailable, "live", "key")).toEqual({ ok: false, db: "down", model: "configured" });
  expect(await healthStatus(unavailable, "demo")).toEqual({ ok: true, db: "down", model: "missing" });
  expect(await healthStatus(async () => {}, "live", "key")).toEqual({ ok: true, db: "up", model: "configured" });
  expect((await healthStatus(async () => {}, "live")).ok).toBe(false);
});
