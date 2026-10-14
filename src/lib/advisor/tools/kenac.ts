import { z } from "zod";
import { findKenacOffers, RequirementInput, type FindOptions } from "@/lib/pricing/kenac";
import { Category } from "@/lib/pricing/format";
import { createToolRegistry, type AdvisorTool } from "./index";

export const KenacPriceInput = RequirementInput.extend({ lineId: z.string().min(1).max(12) }).strict();

export function createKenacPriceTool(options: FindOptions = {}): AdvisorTool {
  return {
    name: "find_kenac_price",
    description: "Find up to three fitting items for an existing budget line from Kenac's price list. " +
      "This lookup does not attach a price. Call price_line with the exact returned price and evidence only when " +
      "attachable is true: only full fits with usable prices may be attached. Partial fits are unconfirmed. " +
      "Say aloud that the price is from Kenac's price list. Never present Kenac as the only option; offer alternatives. " +
      "When needsCompetingQuotes is true, mention competing quotes. If no item fits, leave the line Unpriced and request quotes.",
    schema: KenacPriceInput,
    async execute(input, context) {
      const args = KenacPriceInput.parse(input);
      const line = context.plan.lines.find((item) => item.id === args.lineId);
      if (!line || line.state === "dismissed") return { output: { ok: false, error: "Choose an active budget line." } };
      if (Category.safeParse(line.category).data !== args.category) {
        return { output: { ok: false, error: "Use the budget line's category." } };
      }
      if (context.signal.aborted) return { output: { ok: false, error: "Pricing lookup was cancelled." } };
      const needsCompetingQuotes = context.plan.profile.isPublicEntity === true;
      try {
        // A per-unit price must also match the line's unit, when the user has specified it.
        const offers = (await findKenacOffers({ category: args.category, constraints: args.constraints }, { ...options,
          unit: line.unit,
          currency: line.price?.currency ?? context.plan.profile.reportingCurrency,
          requireCompetingQuotes: needsCompetingQuotes })).slice(0, 3);
        if (context.signal.aborted) return { output: { ok: false, error: "Pricing lookup was cancelled." } };
        // Only these full-fit prices can pass T1's price_line evidence authorization.
        for (const offer of offers) if (offer.attachable && offer.price &&
          !context.documentedPrices.some((price) => JSON.stringify(price) === JSON.stringify(offer.price))) {
          context.documentedPrices.push(offer.price);
        }
        context.documentedLinePrices ??= new Map();
        context.documentedLinePrices.set(line.id, offers.flatMap((offer) => offer.attachable && offer.price ?
          [{ price: offer.price, scope: JSON.stringify([line.category, line.unit, line.title, line.note]) }] : []));
        return { output: { ok: true, lineId: line.id, offers, needsCompetingQuotes,
          ...(!offers.some((offer) => offer.attachable) ? { suggestion: "Request quotes" } : {}) } };
      } catch {
        // Do not expose database configuration, connection errors or catalogue text.
        return { output: { ok: false, offers: [], needsCompetingQuotes,
          suggestion: "Request quotes", error: "Kenac's price list is unavailable. Keep the line unpriced." } };
      }
    },
  };
}

export const kenacPriceTool = createKenacPriceTool();

/** Uses T1's registry extension point; T8 can supply this registry to runAgent. */
export function createKenacToolRegistry(options: FindOptions = {}) {
  return createToolRegistry([createKenacPriceTool(options)]);
}
