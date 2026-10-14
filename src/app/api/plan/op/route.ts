import { z } from "zod";
import { applyOp, PlanOp } from "@/lib/plan/ops";
import { getSession } from "@/lib/session/cookie";
import { sessionStore } from "@/lib/session";
import { PlanVersionConflict } from "@/lib/session/prisma-store";

const OpRequest = z.object({ op: PlanOp }).strict();

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Send a valid plan change." }, { status: 400 });
  }
  const parsed = OpRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the plan change and try again." }, { status: 400 });
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Start a conversation to create your plan." }, { status: 401 });
    const result = applyOp(session.plan, parsed.data.op, "user");
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
    await sessionStore.updatePlan(session.id, result.plan);
    return Response.json({ plan: result.plan }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PlanVersionConflict || (error instanceof Error && error.message === "Plan version went backwards")) {
      return Response.json({ error: "The plan changed. Reload it and try again." }, { status: 409 });
    }
    return Response.json({ error: "We couldn't save that change. Try again in a moment." }, { status: 503 });
  }
}
