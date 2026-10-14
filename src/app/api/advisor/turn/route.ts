import { createTurnHandler } from "@/lib/advisor/turn-handler";

export const runtime = "nodejs";
export const maxDuration = 65;
export const POST = createTurnHandler();
