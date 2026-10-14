import { authorisedKenac } from "@/lib/export/kenac-auth";
import { listSharedRows } from "@/lib/export/shared-sessions";
import { sharingCsv } from "@/lib/export/sharing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  if (!authorisedKenac(request)) return Response.json({ error: "Open the Kenac view with your access token." }, { status: 401, headers });
  try {
    const rows = await listSharedRows();
    process.stdout.write(`${JSON.stringify({ event: "kenac_csv", count: rows.length })}\n`);
    return new Response(sharingCsv(rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="Kenac-shared-items.csv"' } });
  } catch { return Response.json({ error: "Shared items are unavailable. Try again." }, { status: 503, headers }); }
}
