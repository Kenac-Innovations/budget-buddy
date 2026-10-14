import { describe, expect, it, vi } from "vitest";
import { log, redact } from "./log";

describe("structured logs", () => {
  it("drops text, emails, names, nested contacts, errors and tokens", () => {
    const safe = redact({ event: "session_saved", sessionId: "session-secret", route: "/api/session/save", status: 200, ms: 12, email: "cio@example.org", name: "Leader", message: "private text", messages: ["private"], contact: { email: "cio@example.org" }, token: "bearer", error: new Error("private") });
    expect(Object.keys(safe).sort()).toEqual(["event", "ms", "route", "sessionId", "status"]);
    expect(JSON.stringify(safe)).not.toMatch(/session-secret|private|example.org|Leader|bearer/);
    expect(safe.sessionId).toMatch(/^[a-f0-9]{64}$/);
    expect(redact({ event: "session_saved", sessionId: "session-secret" }).sessionId).toBe(safe.sessionId);
  });
  it("rejects PII smuggled into event or route", () => {
    expect(redact({ event: "cio@example.org" })).toEqual({ event: "request_failed" });
    expect(redact({ event: "request_completed", route: "/r/bearer-secret" })).toEqual({ event: "request_failed" });
  });
  it("writes one safe JSON record", () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
    log({ event: "health_checked", status: 200, message: "private" });
    expect(JSON.parse(String(write.mock.calls[0][0]))).toEqual({ event: "health_checked", status: 200 });
    write.mockRestore();
  });
});
