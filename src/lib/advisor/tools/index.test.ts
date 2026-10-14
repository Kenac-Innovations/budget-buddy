import { describe, expect, it } from "vitest";
import { z } from "zod";
import { applyOp } from "@/lib/plan/ops";
import { emptyPlan, type LinePrice } from "@/lib/plan/types";
import { ADVISOR_OPS, createToolRegistry, type ToolContext } from ".";

function context(): ToolContext {
  const added = applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "Endpoint refresh", category: "Hardware", quantity: 20, frequency: "one_off" }, "advisor");
  if (!added.ok) throw new Error("fixture");
  return { plan: added.plan, message: "Budget planning", userMessages: [], signal: new AbortController().signal, documentedPrices: [] };
}
const price: LinePrice = { unitPrice: "100.00", currency: "USD", evidence: { type: "QUOTE", reference: "Quote Q1", capturedAt: "2026-10-14" } };

describe("advisor tool registry", () => {
  it("registers exactly the nine advisor ops plus wrap-up", async () => {
    const registry = createToolRegistry();
    expect(registry.definitions().map((d) => d.name)).toEqual([...ADVISOR_OPS, "suggest_wrap_up"]);
    for (const name of ["set_state", "set_sharing"]) {
      expect((await registry.execute(name, "{}", context())).output.ok).toBe(false);
      expect(() => registry.register({ name, description: "bad", schema: z.object({}), execute: () => ({ output: { ok: true } }) })).toThrow();
    }
  });
  it("validates arguments and returns reducer errors without echoing bad inputs", async () => {
    const registry = createToolRegistry();
    expect((await registry.execute("add_objective", "{bad", context())).output).toMatchObject({ ok: false, error: expect.any(String) });
    expect((await registry.execute("add_objective", JSON.stringify({ title: "PII", extra: "name@example.com" }), context())).output.error).not.toContain("name@example.com");
    expect((await registry.execute("add_initiative", JSON.stringify({ objectiveId: "bad", title: "Recovery", disposition: "fund", rationale: "Restore services" }), context())).output).toMatchObject({ ok: false, error: "No active objective bad." });
  });
  it("keeps the planning period and currency when only profile bands are supplied", async () => {
    const ctx = context();
    const changed = applyOp(ctx.plan, { op: "set_profile", profile: { periodStart: "2027-04", periodEnd: "2028-03", reportingCurrency: "ZAR" } }, "user");
    if (!changed.ok) throw new Error("fixture");
    ctx.plan = changed.plan;
    const result = await createToolRegistry().execute("set_profile", '{"profile":{"role":"CTO","periodStart":null,"periodEnd":null,"reportingCurrency":null}}', ctx);
    expect(result.op).toMatchObject({ profile: { role: "CTO", periodStart: "2027-04", periodEnd: "2028-03", reportingCurrency: "ZAR" } });
  });
  it("rejects own estimates, invented sources, invalid dates and forged operator labels", async () => {
    const registry = createToolRegistry();
    const execute = (candidate: LinePrice, ctx = context()) => registry.execute("price_line", JSON.stringify({ id: "l1", price: candidate }), ctx);
    expect((await execute({ ...price, evidence: { ...price.evidence, type: "USER_ESTIMATE" } })).output.error).toContain("ai_without_source");
    expect((await execute(price)).output.ok).toBe(false);
    expect((await execute({ ...price, evidence: { ...price.evidence, capturedAt: "nonsense" } })).output.ok).toBe(false);
    const ctx = context(); ctx.userMessages = ["Quote Q1, USD 100.00 captured 2026-10-14"];
    expect((await execute(price, ctx)).op?.op).toBe("price_line");
    expect((await execute({ ...price, evidence: { ...price.evidence, supplier: { name: "Kenac", isOperator: true } } }, ctx)).output.ok).toBe(false);
    const operator = { ...price, evidence: { ...price.evidence, type: "OPERATOR_PRICE_LIST" as const, supplier: { name: "Kenac", isOperator: true } } };
    ctx.documentedPrices.push(operator);
    expect((await execute(operator, ctx)).output.ok).toBe(false);
    const line=ctx.plan.lines[0];
    ctx.documentedLinePrices=new Map([[line.id, [{ price: operator, scope: JSON.stringify([line.category,line.unit,line.title,line.note]) }]]]);
    expect((await execute(operator, ctx)).output.ok).toBe(true);
    ctx.documentedLinePrices=new Map([["other-line", [{price:operator,scope:JSON.stringify([line.category,line.unit,line.title,line.note])}]]]);
    expect((await execute(operator, ctx)).output.ok).toBe(false);
    ctx.documentedLinePrices=new Map([[line.id, [{price:operator,scope:"outdated scope"}]]]);
    expect((await execute(operator, ctx)).output.ok).toBe(false);
  });
  it("can add a validated T4 lookup without changing the loop", async () => {
    const registry = createToolRegistry([{ name: "find_kenac_price", description: "Test fitting lookup", schema: z.object({ category: z.string() }),
      execute(_input, ctx) { ctx.documentedPrices.push(price); return { output: { ok: true, offers: [price] } }; } }]);
    const ctx = context();
    await registry.execute("find_kenac_price", '{"category":"Hardware"}', ctx);
    expect(ctx.documentedPrices).toEqual([price]);
    expect(() => registry.register({ name: "find_kenac_price", description: "duplicate", schema: z.object({}), execute: () => ({ output: { ok: true } }) })).toThrow();
  });
  it("does not rewrite dismissed objectives", async () => {
    const objective = applyOp(emptyPlan(), { op: "add_objective", title: "Expand branches" }, "advisor");
    if (!objective.ok) throw new Error("fixture");
    const dismissed = applyOp(objective.plan, { op: "set_state", id: "o1", state: "dismissed", reason: "Not approved" }, "user");
    if (!dismissed.ok) throw new Error("fixture");
    expect((await createToolRegistry().execute("update_objective", '{"id":"o1","title":"Reopen branches"}', { ...context(), plan: dismissed.plan })).output.ok).toBe(false);
  });
  it("gates early wrap-up and permits an explicit finish request", async () => {
    const registry = createToolRegistry();
    expect((await registry.execute("suggest_wrap_up", "{}", context())).output.ok).toBe(false);
    const ctx = context(); ctx.message = "Let's wrap up";
    expect((await registry.execute("suggest_wrap_up", "{}", ctx)).event?.type).toBe("wrap_up");
  });
});
