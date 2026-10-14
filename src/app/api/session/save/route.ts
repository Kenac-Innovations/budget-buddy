import { getSession } from "@/lib/session/cookie";
import { sessionStore } from "@/lib/session";
import { ContactInput } from "@/lib/session/prisma-store";
import { planLinks, sendPlanEmail } from "@/lib/email/plan-email";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Check your details and try again." }, { status: 400 });
  }
  const parsed = ContactInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter your name, work email, organisation and role, and choose email consent to save." }, { status: 400 });
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Start a conversation before saving your plan." }, { status: 401 });
    // Validate the public URL before committing details; never trust the request Host header.
    planLinks(session.token);
    await sessionStore.save(session.id, parsed.data);
    const delivery = await sendPlanEmail({ ...session, contact: parsed.data, savedAt: new Date() });
    return Response.json({ saved: true, emailed: delivery.emailed, returnUrl: delivery.returnUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "We couldn't save your plan. Try again in a moment." }, { status: 503 });
  }
}
