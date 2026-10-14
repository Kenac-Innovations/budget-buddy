"use server";

import { cookies } from "next/headers";
import { DELETE as deleteSession } from "@/app/api/session/route";
import { getSession, sessionCookieOptions } from "@/lib/session/cookie";
import { SESSION_COOKIE } from "@/lib/session/store";

/** No caller-supplied token or mode. A query parameter cannot reset a live session. */
export async function resetDemoSession(): Promise<boolean> {
  if (process.env.ADVISOR_MODE === "live" || (process.env.ADVISOR_MODE && process.env.ADVISOR_MODE !== "demo")) return false;
  try {
    const session = await getSession();
    // A saved plan keeps its private return link. Only the disposable demo draft is deleted.
    if (session?.savedAt) {
      (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
      return true;
    }
    return (await deleteSession()).status === 204;
  } catch {
    return false;
  }
}
