import { z } from "zod";
import { getSession } from "@/lib/session/cookie";
import { sharedRows } from "@/lib/export/sharing";
import { recordSharing } from "@/lib/export/shared-sessions";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Open your private plan to review sharing." }, { status: 401, headers });
    if (!session.savedAt) return Response.json({ error: "Save your plan before choosing what to share." }, { status: 403, headers });
    return Response.json({ plan: session.plan, contact: session.contact, saved: true, rows: sharedRows(session.plan, session.contact) }, { headers });
  } catch { return Response.json({ error: "We couldn't load sharing. Try again." }, { status: 503, headers }); }
}

/** Call after set_sharing ops. This records dates and indexes memory sessions; never edits a plan. */
export async function POST(request: Request) {
  try {
    const parsed = z.object({}).strict().safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Send an empty sharing confirmation." }, { status: 400, headers });
  } catch { return Response.json({ error: "Send a valid sharing confirmation." }, { status: 400, headers }); }
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Open your private plan to confirm sharing." }, { status: 401, headers });
    if (!session.savedAt || !session.contact) return Response.json({ error: "Save your plan before sharing." }, { status: 403, headers });
    const dates = await recordSharing(session);
    return Response.json({ rows: sharedRows(session.plan, session.contact, dates) }, { headers });
  } catch { return Response.json({ error: "We couldn't confirm sharing. Reopen sharing to check your choices." }, { status: 503, headers }); }
}
