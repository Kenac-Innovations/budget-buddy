import { log } from "@/lib/log";
import { getSession } from "@/lib/session/cookie";
import { buildWorkbook } from "@/lib/export/workbook";

export const runtime = "nodejs";
export async function GET() {
  const start=Date.now();
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Open your private plan before downloading it." }, { status: 401, headers });
    const buffer = await buildWorkbook(session.plan, session.savedAt && session.contact ? { organisation: session.contact.organisation, role: session.contact.role } : {});
    log({ event: "request_completed", route: "/api/export/xlsx", status: 200, ms: Date.now()-start, sessionId: session.id });
    return new Response(new Uint8Array(buffer), { headers: { ...headers, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="ICT-plan-2027.xlsx"', "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ error: "We couldn't prepare the Excel file. Try again in a moment." }, { status: 503, headers });
  }
}
