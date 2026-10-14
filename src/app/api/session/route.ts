import { cookies } from "next/headers";
import { deleteSessionByToken, sessionStore } from "@/lib/session";
import { readSessionCookie, sessionCookieOptions } from "@/lib/session/cookie";
import { SESSION_COOKIE } from "@/lib/session/store";
import { forgetSharedSession } from "@/lib/export/shared-sessions";
import { log } from "@/lib/log";

/** Cookie ownership only; repeating deletion is safe, including on a fresh device. */
export async function DELETE() {
  try {
    const token = await readSessionCookie();
    if (token) {
      const session = await sessionStore.findByToken(token);
      await deleteSessionByToken(token);
      if (session) {
        forgetSharedSession(session.id);
        log({ event: "session_deleted", route: "/api/session", sessionId: session.id, status: 204 });
      }
    }
    (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Your plan could not be deleted. Try again in a moment." }, { status: 503 });
  }
}
