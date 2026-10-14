import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/session";
import { SessionToken } from "@/lib/session/prisma-store";
import { setSessionCookie } from "@/lib/session/cookie";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" };
  try {
    const session = SessionToken.safeParse(token).success ? await sessionStore.findByToken(token) : null;
    if (session?.savedAt) {
      await setSessionCookie(session.token);
      return NextResponse.redirect(new URL("/", request.url), { status: 303, headers });
    }
    return NextResponse.redirect(new URL("/?notice=link-expired", request.url), { status: 303, headers });
  } catch {
    // A database outage is recoverable; don't call a valid link expired.
    return NextResponse.redirect(new URL("/?notice=resume-unavailable", request.url), { status: 303, headers });
  }
}
