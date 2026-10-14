import { z } from "zod";
import type { FunctionTool } from "openai/resources/responses/responses";
import { PlanOp, applyOp } from "@/lib/plan/ops";
import { LinePrice, type Plan } from "@/lib/plan/types";
import type { AdvisorEvent } from "../events";
import { readyToWrapUp, requestedWrapUp, wrapUpSummary } from "../summary";
import { parseToolInput, toolParameters } from "./schema";

export const ADVISOR_OPS = ["set_profile", "add_objective", "update_objective", "add_initiative",
  "update_initiative", "add_line", "update_line", "price_line", "clear_price"] as const;

export interface ToolContext {
  plan: Plan;
  message: string;
  userMessages: readonly string[];
  signal: AbortSignal;
  /** T4 records fitting offers here. The model cannot authorize its own evidence. */
  documentedPrices: LinePrice[];
  documentedLinePrices?: Map<string, { price: LinePrice; scope: string }[]>;
}

export interface ToolResult {
  output: { ok: boolean; createdId?: string; error?: string; [key: string]: unknown };
  op?: PlanOp;
  event?: AdvisorEvent;
}

export interface AdvisorTool {
  name: string;
  description: string;
  schema: z.ZodType;
  execute(input: unknown, context: ToolContext): ToolResult | Promise<ToolResult>;
}

export class ToolRegistry {
  private tools = new Map<string, AdvisorTool>();

  register(tool: AdvisorTool): this {
    if (this.tools.has(tool.name) || ["set_state", "set_sharing"].includes(tool.name)) {
      throw new Error("Tool name is unavailable");
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  definitions(): FunctionTool[] {
    return [...this.tools.values()].map((tool) => ({ type: "function", name: tool.name,
      description: tool.description, parameters: toolParameters(tool.schema), strict: true }));
  }

  async execute(name: string, args: string, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { output: { ok: false, error: "Tool is not available to the advisor." } };
    let input: unknown;
    try { input = parseToolInput(tool.schema, JSON.parse(args)); }
    catch { return { output: { ok: false, error: "Invalid tool arguments. Follow the tool schema and retry." } }; }
    // Execution failures propagate to the turn handler; never send exception text to the model/client.
    return tool.execute(input, context);
  }
}

const descriptions: Record<(typeof ADVISOR_OPS)[number], string> = {
  set_profile: "Record only user-provided role, sector and size bands. Never infer a sector or role.",
  add_objective: "Propose a business objective in the user's words. Return the assigned id.",
  update_objective: "Clarify an existing objective using its id. Never overturn a dismissal.",
  add_initiative: "Propose category-only advice linked to an objective, with a reason, dated sources and caution. Use proactive for a supported catch.",
  update_initiative: "Update existing category-only advice; respect dismissReason and the user's decision.",
  add_line: "Propose an unpriced budget line. Include forgotten costs and never assume quantities or dates.",
  update_line: "Update an existing line with user-confirmed scope, quantity or timing.",
  price_line: "Attach only verified documented evidence. USER_ESTIMATE is user-only. Never invent a reference or price. Operator evidence must come from a fitting lookup offer.",
  clear_price: "Remove an unsupported price; the line becomes Unpriced, never zero.",
};

function hasDocumentedPrice(price: LinePrice, context: ToolContext, lineId: string): boolean {
  if (price.evidence.supplier?.isOperator || price.evidence.type === "OPERATOR_PRICE_LIST") {
    const line = context.plan.lines.find((item) => item.id === lineId);
    return !!line && (context.documentedLinePrices?.get(lineId) ?? []).some((offer) =>
      JSON.stringify(offer.price) === JSON.stringify(price) && offer.scope === JSON.stringify([line.category, line.unit, line.title, line.note]));
  }
  if (context.documentedPrices.some((p) => JSON.stringify(p) === JSON.stringify(price))) return true;
  if (!["QUOTE", "PUBLISHED_PRICE"].includes(price.evidence.type) || price.evidence.supplier?.isOperator) return false;
  // Conservative grounding: the same user statement must contain the amount, currency, source and date.
  // Structured quote ingestion can add validated evidence to documentedPrices at integration time.
  return context.userMessages.some((message) => [price.unitPrice, price.currency,
    price.evidence.reference, price.evidence.capturedAt, price.evidence.validUntil,
    price.evidence.supplier?.name].filter((v): v is string => v !== undefined)
    .every((v) => message.includes(v)));
}

export function createToolRegistry(extraTools: AdvisorTool[] = []): ToolRegistry {
  const registry = new ToolRegistry();
  for (const name of ADVISOR_OPS) {
    const opSchema: z.ZodObject = PlanOp.options.find((s) => s.shape.op.value === name)!;
    registry.register({ name, description: descriptions[name], schema: opSchema.omit({ op: true }),
      execute(input, context) {
        const fields = input as Record<string, unknown>;
        // Profile.partial() carries defaults in the frozen contract. Preserve the current
        // period/currency when a tool only supplies role or bands.
        const op = PlanOp.parse({ ...fields, op: name, ...(name === "set_profile"
          ? { profile: { ...context.plan.profile, ...(fields.profile as object) } } : {}) });
        // The frozen reducer remains the authority, including rejection of USER_ESTIMATE.
        const result = applyOp(context.plan, op, "advisor");
        if (!result.ok) return { output: { ok: false, error: result.error } };
        if (op.op === "price_line") {
          const dates = [op.price.evidence.capturedAt, op.price.evidence.validUntil].filter(Boolean);
          if (dates.some((d) => !Number.isFinite(Date.parse(d!))) || !hasDocumentedPrice(op.price, context, op.id)) {
            return { output: { ok: false, error: "Price rejected: evidence is not verified. Leave the line unpriced; request a dated quote or use a fitting sourced offer." } };
          }
        }
        // Do not let the model rewrite items the user has set aside.
        if ("id" in op && op.op.startsWith("update_")) {
          const item = [...context.plan.objectives, ...context.plan.initiatives, ...context.plan.lines].find((i) => i.id === op.id);
          if (item?.state === "dismissed") return { output: { ok: false, error: "The user set this item aside. Respect their decision." } };
        }
        return { op, output: { ok: true, ...(result.createdId ? { createdId: result.createdId } : {}) } };
      },
    });
  }
  registry.register({ name: "suggest_wrap_up", description: "Offer saving once accepted objectives have initiatives and lines, or when the user asks to finish. The server calculates the summary; never do arithmetic in text.",
    schema: z.object({}), execute(_input, context) {
      if (!readyToWrapUp(context.plan) && !requestedWrapUp(context.message)) {
        return { output: { ok: false, error: "Continue shaping the plan until the user accepts objectives, initiatives and lines, or asks to finish." } };
      }
      const summary = wrapUpSummary(context.plan);
      return { output: { ok: true, summary }, event: { type: "wrap_up", summary } };
    },
  });
  for (const tool of extraTools) registry.register(tool);
  return registry;
}
