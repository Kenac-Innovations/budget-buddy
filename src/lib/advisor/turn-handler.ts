import { log } from "@/lib/log";
import { SESSION_COOKIE, type SessionStore } from "@/lib/session/store";
import { runAgent, type ResponsesClient } from "./agent";
import { runDemo } from "./demo";
import { AdvisorEvent, TurnRequest, encodeEvent } from "./events";
import { getSessionStore } from "./session-store";

interface HandlerOptions {
  store?: () => SessionStore | Promise<SessionStore>;
  client?: ResponsesClient;
  mode?: "demo" | "live";
  demoWordDelayMs?: number;
  demoOpDelayMs?: number;
}

const active = new Set<string>();
const encoder = new TextEncoder();

export function createTurnHandler(options: HandlerOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
    const start=Date.now();
    let message: string;
    try {
      const body = await request.text();
      if (body.length > 32_000) return Response.json({ error: "The message is too long." }, { status: 413 });
      message = TurnRequest.parse(JSON.parse(body)).message.trim();
      if (!message) throw new Error("Empty message");
    } catch { return Response.json({ error: "Send a message between 1 and 4,000 characters." }, { status: 400 }); }
    const mode = options.mode ?? process.env.ADVISOR_MODE ?? "demo";
    if (mode !== "demo" && mode !== "live") return Response.json({ error: "Set ADVISOR_MODE to demo or live." }, { status: 503 });
    let store: SessionStore;
    let session;
    let created = false;
    try {
      store = await (options.store ?? getSessionStore)();
      const cookie = request.headers.get("cookie")?.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
      const token = cookie ? decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1)) : undefined;
      session = token ? await store.findByToken(token) : null;
      if (!session) { session = await store.create(); created = true; }
    } catch { return Response.json({ error: "I couldn't open your session. Please try again." }, { status: 503 }); }
    if (active.has(session.id)) return Response.json({ error: "A reply is already in progress. Wait for it to finish." }, { status: 409 });
    active.add(session.id);
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    let closed = false;
    let failed = false;
    const body = new ReadableStream<Uint8Array>({
      async start(stream) {
        const emit = (event: AdvisorEvent) => {
          if (event.type === "error") failed = true;
          if (closed || controller.signal.aborted) return;
          try { stream.enqueue(encoder.encode(encodeEvent(AdvisorEvent.parse(event)))); }
          catch { closed = true; controller.abort(); }
        };
        try {
          const common = { session, store, message, emit, signal: controller.signal };
          if (mode === "demo") await runDemo({ ...common, wordDelayMs: options.demoWordDelayMs, opDelayMs: options.demoOpDelayMs });
          else await runAgent({ ...common, client: options.client });
        } catch {
          // No raw exceptions, message text or contact details reach logs or the response.
          emit({ type: "error", message: "I couldn't complete this turn. Please reload your plan and try again.", retryable: true });
        } finally {
          log({ event: failed ? "request_failed" : "advisor_completed", route: "/api/advisor/turn", sessionId: session.id, status: 200, ms: Date.now()-start });
          active.delete(session.id);
          request.signal.removeEventListener("abort", abort);
          if (!closed) { closed = true; stream.close(); }
        }
      },
      cancel() { closed = true; controller.abort(); },
    });
    const headers = new Headers({ "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff" });
    if (created) headers.set("Set-Cookie", `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return new Response(body, { headers });
  };
}
