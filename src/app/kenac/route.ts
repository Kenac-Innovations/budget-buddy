import { authorisedKenac } from "@/lib/export/kenac-auth";
import { listSharedRows } from "@/lib/export/shared-sessions";
import { kenacHtml } from "./view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
  const nonce = request.headers.get("x-nonce") ?? "";
  if (!authorisedKenac(request)) return new Response(kenacHtml(null, nonce), { status: 401, headers });
  try {
    const rows = await listSharedRows();
    process.stdout.write(`${JSON.stringify({ event: "kenac_view", count: rows.length })}\n`);
    return new Response(kenacHtml(rows, nonce), { headers });
  } catch {
    return new Response(kenacHtml(null, nonce, "Shared items are unavailable. Try again in a moment."), { status: 503, headers });
  }
}
