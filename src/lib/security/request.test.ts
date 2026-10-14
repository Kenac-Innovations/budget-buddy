import { describe, expect, it, vi } from "vitest";
import { checkJsonBody, clientIp, MAX_JSON_BYTES } from "./request";

const request = (body: BodyInit, headers: Record<string, string> = {}) => new Request("https://example.org/api/test", { method: "POST", body, headers: { "content-type": "application/json", ...headers }, duplex: "half" } as RequestInit);

describe("request boundaries", () => {
  it("accepts exactly 16 KB and rejects oversized bytes, including multi-byte text", async () => {
    expect(await checkJsonBody(request("x".repeat(MAX_JSON_BYTES)))).toBeNull();
    expect(await checkJsonBody(request("x".repeat(MAX_JSON_BYTES + 1)))).toBe(413);
    expect(await checkJsonBody(request("é".repeat(MAX_JSON_BYTES)))).toBe(413);
  });
  it("caps chunked bodies and does not consume the route body", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(10000)); controller.enqueue(new Uint8Array(10000)); controller.close(); } });
    expect(await checkJsonBody(request(stream))).toBe(413);
    const original = request('{"message":"hello"}');
    expect(await checkJsonBody(original)).toBeNull();
    expect(await original.json()).toEqual({ message: "hello" });
  });
  it("checks type and declared size", async () => {
    expect(await checkJsonBody(request("{}", { "content-type": "text/plain" }))).toBe(415);
    expect(await checkJsonBody(request("{}", { "content-length": "999999" }))).toBe(413);
    expect(await checkJsonBody(request("{}", { "content-length": "invalid" }))).toBe(413);
    expect(await checkJsonBody(new Request("https://example.org"))).toBeNull();
  });
  it("times out stalled bodies and safely rejects broken streams", async () => {
    vi.useFakeTimers();
    try {
      const stalled = checkJsonBody(request(new ReadableStream({ start() {} })));
      await vi.advanceTimersByTimeAsync(5000);
      expect(await stalled).toBe(408);
    } finally { vi.useRealTimers(); }
    const broken = new ReadableStream({ start(controller) { controller.error(new Error("private body")); } });
    expect(await checkJsonBody(request(broken))).toBe(400);
  });
  it("ignores untrusted forwarding headers and validates trusted values", () => {
    const headers = new Headers({ "x-forwarded-for": "192.0.2.1, 10.0.0.1" });
    expect(clientIp(headers)).toBe("unknown");
    expect(clientIp(headers, "x-forwarded-for")).toBe("192.0.2.1");
    expect(clientIp(new Headers({ "x-real-ip": "cio@example.org" }), "x-real-ip")).toBe("unknown");
  });
});

it("accepts the empty DELETE stream produced by Next without requiring a content type", async () => {
  const request = new Request("https://plan.example.test/api/session", { method: "DELETE", body: new ReadableStream({start(controller){controller.close();}}), duplex: "half" } as RequestInit);
  expect(await checkJsonBody(request)).toBeNull();
});
