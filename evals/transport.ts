import { readEvents, TurnRequest } from "../src/lib/advisor/events";
import type { AdvisorEvent } from "../src/lib/advisor/events";
import type { Stage } from "./schema";

/** One jar per scenario. Host-only cookies stay scoped to the configured advisor origin. */
export class AdvisorTransport {
  private cookies = new Map<string, string>();
  constructor(private baseUrl: string, private fetcher: typeof fetch = fetch) {}

  async turn(message: string, signal: AbortSignal) {
    const response = await this.fetcher(new URL("/api/advisor/turn", this.baseUrl), {
      method: "POST", redirect: "error", signal,
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson",
        Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; ") },
      body: JSON.stringify(TurnRequest.parse({ message })),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const at = pair.indexOf("=");
      if (at < 1) continue;
      const key = pair.slice(0, at);
      const value = pair.slice(at + 1);
      if (!value || /max-age=0\b/i.test(cookie)) this.cookies.delete(key);
      else this.cookies.set(key, value);
    }
    if (!response.ok) throw new Error(`Advisor HTTP ${response.status}; check server mode and availability.`);
    if (!response.headers.get("content-type")?.includes("application/x-ndjson") || !response.body) throw new Error("Advisor did not return NDJSON.");
    const events: AdvisorEvent[] = [];
    for await (const event of readEvents(response.body)) {
      events.push(event);
      if (events.length > 2000 || events.reduce((size, e) => size + JSON.stringify(e).length, 0) > 2_000_000) throw new Error("Advisor stream exceeded eval limits.");
    }
    const final = events.findLast((event) => event.type === "done");
    if (!final || final.type !== "done") throw new Error("Advisor stream missing done.");
    return {
      events, plan: final.plan,
      text: events.filter((event) => event.type === "text").map((event) => event.delta).join(""),
      fixture: response.headers.get("x-budget-buddy-eval-fixture") === "true",
    };
  }
}

/** The contract exposes no stage event. Classify conservatively from explicit sourcing intent. */
export function inferStage(message: string, events: AdvisorEvent[]): Stage {
  // An initiative is advice even if the same turn also adds budget lines.
  if (events.some((event) => event.type === "op" && /initiative$/.test(event.op.op))) return "advice";
  if (events.some((event) => event.type === "wrap_up")) return "wrap_up";
  if (/\b(cost|price|pricing|quote|estimate|sourc\w*)\b/i.test(message) ||
    events.some((event) => event.type === "op" && event.op.op === "price_line")) return "budget";
  return "advice";
}
