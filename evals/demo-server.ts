import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { encodeEvent, TurnRequest } from "../src/lib/advisor/events";
import { scriptedTurn } from "../src/lib/advisor/fixtures";
import { InMemorySessionStore, SESSION_COOKIE } from "../src/lib/session/store";

/** Contract stand-in only. T1 owns the production route. Never a release-quality advisor. */
export function createDemoServer(): Server {
  const store = new InMemorySessionStore();
  return createServer(async (request, response) => {
    try {
      if (request.method !== "POST" || request.url !== "/api/advisor/turn") { response.writeHead(404).end(); return; }
      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
        if (body.length > 20_000) { response.writeHead(413).end(); return; }
      }
      const input = TurnRequest.parse(JSON.parse(body));
      const cookie = request.headers.cookie?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${SESSION_COOKIE}=`));
      const existing = cookie ? await store.findByToken(cookie.slice(SESSION_COOKIE.length + 1)) : null;
      const session = existing ?? await store.create();
      const index = session.messages.length / 2;
      const result = scriptedTurn(index, session.plan);
      await store.appendTurn(session.id, [{ role: "user", content: input.message }, { role: "assistant", content: "fixture" }], result.plan);
      response.writeHead(200, { "Content-Type": "application/x-ndjson", "X-Budget-Buddy-Eval-Fixture": "true",
        ...(existing ? {} : { "Set-Cookie": `${SESSION_COOKIE}=${session.token}; Path=/; HttpOnly; SameSite=Lax` }) });
      for (const event of result.events) response.write(encodeEvent(event));
      response.end();
    } catch { response.writeHead(400).end(); }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createDemoServer();
  server.listen(3207, "127.0.0.1", () => process.stdout.write("Eval HTTP fixture listening on http://127.0.0.1:3207 (in-memory store)\n"));
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { server.closeAllConnections(); server.close(); });
}
