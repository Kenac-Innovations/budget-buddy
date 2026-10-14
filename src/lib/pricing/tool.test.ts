import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanView } from "@/components/advisor/plan-view";
import { runAgent, type ResponsesClient } from "@/lib/advisor/agent";
import type { AdvisorEvent } from "@/lib/advisor/events";
import { createKenacToolRegistry } from "@/lib/advisor/tools/kenac";
import type { ToolContext } from "@/lib/advisor/tools";
import { applyOp } from "@/lib/plan/ops";
import { emptyPlan, LinePrice } from "@/lib/plan/types";
import { InMemorySessionStore } from "@/lib/session/store";
import { KENAC_NAME, type CatalogueEntry, type CatalogueReader } from "./catalogue";

const asOf = new Date("2026-10-14T12:00:00Z");
const entry: CatalogueEntry = { id: "test", sku: "TEST-A", name: "Synthetic test endpoint", category: "Hardware",
  attributes: { ram_gb: 16 }, unit: "device", price: "1234.56", currency: "USD", priceListRef: "Synthetic test list",
  priceListDate: new Date("2026-10-14"), validUntil: new Date("2027-12-31T23:59:59.999Z"), active: true,
  supplier: { id: "kenac", name: KENAC_NAME, isOperator: true } };
const args = { lineId: "l1", category: "Hardware", constraints: [{ key: "ram_gb", op: "gte", value: 16 }] };
const catalogue: CatalogueReader = { loadActive: async () => [entry] };
function context(): ToolContext {
  const added = applyOp(emptyPlan(), { op: "add_line", title: "Endpoint refresh", initiativeId: null,
    category: "Hardware", unit: "device", quantity: 2, frequency: "one_off" }, "user");
  if (!added.ok) throw new Error("fixture");
  return { plan: added.plan, message: "Price the endpoint refresh", userMessages: [], documentedPrices: [],
    signal: new AbortController().signal };
}
afterEach(() => vi.unstubAllEnvs());

describe("find_kenac_price tool", () => {
  it("registers through T1's registry, looks up without changing the plan and authorizes a separate price_line", async () => {
    const ctx = context(); const before = structuredClone(ctx.plan);
    const registry = createKenacToolRegistry({ catalogue, asOf });
    const definition = registry.definitions().find((tool) => tool.name === "find_kenac_price")!;
    expect(definition.description).toContain("only full fits");
    expect(definition.description).toContain("Say aloud");
    expect(definition.description).toContain("Never present Kenac as the only option");
    expect(definition.strict).toBe(true);
    expect(definition.parameters).toMatchObject({ required: ["category", "constraints", "lineId"], additionalProperties: false });
    expect((await registry.execute("find_kenac_price", JSON.stringify(args), ctx)).output).toMatchObject({ ok: true,
      offers: [{ attachable: true, price: { unitPrice: "1234.56" } }], needsCompetingQuotes: false });
    expect(ctx.plan).toEqual(before);
    expect(ctx.documentedPrices).toHaveLength(1);
    const price = ctx.documentedPrices[0];
    expect((await registry.execute("price_line", JSON.stringify({ id: "l1", price }), ctx)).op?.op).toBe("price_line");
    expect((await registry.execute("price_line", JSON.stringify({ id: "l1", price: { ...price, unitPrice: "1" } }), ctx)).output.ok).toBe(false);
    await registry.execute("find_kenac_price", JSON.stringify(args), ctx);
    expect(ctx.documentedPrices).toHaveLength(1);
  });
  it.each([true, false])("returns the public-entity flag %s", async (isPublicEntity) => {
    const ctx = context();
    const changed = applyOp(ctx.plan, { op: "set_profile", profile: { isPublicEntity } }, "user");
    if (!changed.ok) throw new Error("fixture"); ctx.plan = changed.plan;
    const result = await createKenacToolRegistry({ catalogue, asOf }).execute("find_kenac_price", JSON.stringify(args), ctx);
    expect(result.output.needsCompetingQuotes).toBe(isPublicEntity);
  });
  it("limits the ranked offers and authorized evidence to three", async () => {
    const many: CatalogueReader = { loadActive: async () => Array.from({ length: 6 }, (_, index) =>
      ({ ...entry, sku: `TEST-${index}`, price: String(100 + index) })) };
    const ctx = context();
    const result = await createKenacToolRegistry({ catalogue: many, asOf }).execute("find_kenac_price", JSON.stringify(args), ctx);
    expect(result.output.offers).toHaveLength(3);
    expect(ctx.documentedPrices).toHaveLength(3);
  });
  it.each<CatalogueEntry>([
    { ...entry, attributes: { ram_gb: 8 } },
    { ...entry, attributes: {} },
    { ...entry, validUntil: new Date("2026-01-01") },
    { ...entry, currency: "ZAR" },
    { ...entry, unit: "pack" },
  ])("never authorizes failed, unconfirmed, expired, foreign-currency or wrong-unit evidence %#", async (item) => {
    const ctx = context();
    const registry = createKenacToolRegistry({ catalogue: { loadActive: async () => [item] }, asOf });
    const result = await registry.execute("find_kenac_price", JSON.stringify(args), ctx);
    expect(result.output.suggestion).toBe("Request quotes");
    expect(ctx.documentedPrices).toEqual([]);
    const invented = LinePrice.parse({ unitPrice: item.price, currency: item.currency, evidence: {
      type: "OPERATOR_PRICE_LIST", reference: `${item.priceListRef} · ${item.sku}`, capturedAt: "2026-10-14T00:00:00.000Z",
      supplier: { name: KENAC_NAME, isOperator: true } } });
    expect((await registry.execute("price_line", JSON.stringify({ id: "l1", price: invented }), ctx)).output.ok).toBe(false);
    expect(ctx.plan.lines[0].price).toBeNull();
  });
  it("returns empty for no imported catalogue and for no fit, without a database or API key", async () => {
    vi.stubEnv("DATABASE_URL", ""); vi.stubEnv("OPENAI_API_KEY", "");
    const ctx = context();
    expect((await createKenacToolRegistry().execute("find_kenac_price", JSON.stringify(args), ctx)).output)
      .toMatchObject({ ok: true, offers: [], suggestion: "Request quotes" });
    expect((await createKenacToolRegistry({ catalogue: { loadActive: async () => [{ ...entry, attributes: { ram_gb: 8 } }] }, asOf })
      .execute("find_kenac_price", JSON.stringify(args), ctx)).output).toMatchObject({ ok: true, offers: [], suggestion: "Request quotes" });
  });
  it("validates every input, including category/line mismatch and nonfinite constraints", async () => {
    const registry = createKenacToolRegistry({ catalogue, asOf });
    const ctx = context();
    for (const input of [ { ...args, lineId: "missing" }, { ...args, category: "Power" },
      { ...args, extra: "name@example.com" }, { ...args, constraints: [{ key: "ram_gb", op: "gte", value: null }] } ]) {
      const result = await registry.execute("find_kenac_price", JSON.stringify(input), ctx);
      expect(result.output.ok).toBe(false);
      expect(JSON.stringify(result.output)).not.toContain("name@example.com");
    }
    expect(ctx.documentedPrices).toEqual([]);
  });
  it("redacts database failures and never authorizes results after cancellation", async () => {
    const registry = createKenacToolRegistry({ catalogue: { loadActive: async () => { throw new Error("secret name@example.com"); } }, asOf });
    const ctx = context();
    const result = await registry.execute("find_kenac_price", JSON.stringify(args), ctx);
    expect(result.output).toMatchObject({ ok: false, offers: [], suggestion: "Request quotes" });
    expect(JSON.stringify(result.output)).not.toContain("name@example.com");
    const controller = new AbortController(); ctx.signal = controller.signal;
    const cancelled = createKenacToolRegistry({ catalogue: { loadActive: async () => { controller.abort(); return [entry]; } }, asOf });
    expect((await cancelled.execute("find_kenac_price", JSON.stringify(args), ctx)).output.ok).toBe(false);
    expect(ctx.documentedPrices).toEqual([]);
  });
  it("runs lookup → price_line through the stubbed agent and memory store, rendering the Kenac labels", async () => {
    const store = new InMemorySessionStore(); const session = await store.create();
    session.plan = context().plan;
    await store.updatePlan(session.id, session.plan);
    let round = 0;
    const client: ResponsesClient = { responses: { create: async (params) => {
      const number = round++;
      let name: string; let input: unknown;
      if (number === 0) { name = "find_kenac_price"; input = args; }
      else if (number === 1) {
        const feedback = (params.input as { type?: string; output?: string }[]).find((item) => item.type === "function_call_output");
        const output = JSON.parse(feedback!.output!);
        name = "price_line"; input = { id: "l1", price: output.offers[0].price };
      } else return (async function* () {
        yield { type: "response.output_text.delta", delta: "This price is from Kenac's price list. You can also request alternatives." };
        yield { type: "response.completed", response: { output: [] } };
      })();
      return (async function* () {
        yield { type: "response.completed", response: { output: [{ type: "function_call", name,
          call_id: `call-${number}`, arguments: JSON.stringify(input) }] } };
      })();
    } } };
    const events: AdvisorEvent[] = [];
    const plan = await runAgent({ session, store, message: "Price these 16 GB endpoints", client,
      registry: createKenacToolRegistry({ catalogue, asOf }), emit: (event) => events.push(event), model: "stub-configurable-model" });
    expect(events.some((event) => event.type === "error")).toBe(false);
    expect(events.filter((event) => event.type === "op").map((event) => event.op.op)).toEqual(["price_line"]);
    expect((await store.findByToken(session.token))?.plan).toEqual(plan);
    const html = renderToStaticMarkup(createElement(PlanView, { plan, changed: {}, disabled: false, onOp: async () => true }));
    expect(html).toContain(">Kenac</span>");
    expect(html).toContain("Kenac price list");
    expect(plan.lines[0].price?.evidence.supplier?.isOperator).toBe(true);
  });
});
