import { z } from "zod";
import { getSession } from "@/lib/session/cookie";

const TextBlock = z.object({ type: z.enum(["text", "input_text", "output_text"]), text: z.string() });
const DisplayMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

/** Provider messages are untrusted; expose text only, never tool calls, reasoning or metadata. */
export function displayTranscript(messages: unknown[]) {
  return messages.flatMap((input) => {
    const result = DisplayMessage.safeParse(input);
    if (!result.success) return [];
    const { role, content } = result.data;
    const text = typeof content === "string" ? content : content.flatMap((block) => {
      const parsed = TextBlock.safeParse(block);
      return parsed.success ? [parsed.data.text] : [];
    }).join("\n");
    return text.trim() ? [{ role, content: text }] : [];
  });
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    return Response.json({ plan: session.plan, messages: displayTranscript(session.messages), saved: session.savedAt !== null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "We couldn't load your plan. Try again in a moment." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
