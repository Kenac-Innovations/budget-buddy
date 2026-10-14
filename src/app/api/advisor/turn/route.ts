import { createTurnHandler } from "@/lib/advisor/turn-handler";

// cacheComponents requires Node.js and disallows a route-level runtime export.
export const maxDuration = 65;
export const POST = createTurnHandler();
