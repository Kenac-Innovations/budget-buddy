import { describe, expect, it } from "vitest";
import { scriptedTurn } from "@/lib/advisor/fixtures";
import { applyOp } from "./ops";
import { emptyPlan, type Plan } from "./types";

function must(r: ReturnType<typeof applyOp>): { plan: Plan; createdId?: string } {
  if (!r.ok) throw new Error(r.error);
  return r;
}

const asOf = new Date("2026-10-13");

describe("plan operations", () => {
  it("assigns readable ids and marks advisor items as proposed", () => {
    const a = must(applyOp(emptyPlan(), { op: "add_objective", title: "Cut outages" }, "advisor"));
    expect(a.createdId).toBe("o1");
    expect(a.plan.objectives[0].state).toBe("proposed");
    expect(a.plan.version).toBe(1);
  });

  it("marks user-created items as accepted", () => {
    const a = must(applyOp(emptyPlan(), { op: "add_objective", title: "Cut outages" }, "user"));
    expect(a.plan.objectives[0].state).toBe("accepted");
  });

  it("does not let the advisor accept items or change sharing", () => {
    const a = must(applyOp(emptyPlan(), { op: "add_objective", title: "X" }, "advisor"));
    expect(applyOp(a.plan, { op: "set_state", id: "o1", state: "accepted" }, "advisor").ok).toBe(false);
    expect(applyOp(a.plan, { op: "set_sharing", id: "o1", shared: true }, "advisor").ok).toBe(false);
  });

  it("rejects an initiative for a missing objective", () => {
    const r = applyOp(emptyPlan(), { op: "add_initiative", objectiveId: "o9", title: "X", disposition: "fund", rationale: "" }, "advisor");
    expect(r.ok).toBe(false);
  });

  it("creates lines unpriced", () => {
    const r = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Hardware", quantity: 4, frequency: "one_off" }, "advisor"));
    expect(r.plan.lines[0].price).toBeNull();
  });

  it("rejects an advisor price backed only by an estimate", () => {
    const base = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Hardware", quantity: 4, frequency: "one_off" }, "advisor"));
    const r = applyOp(
      base.plan,
      {
        op: "price_line",
        id: "l1",
        price: { unitPrice: "1200", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "guess", capturedAt: "2026-10-13" } },
      },
      "advisor",
      asOf,
    );
    expect(r.ok).toBe(false);
  });

  it("accepts an advisor price from the Kenac price list", () => {
    const base = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Hardware", quantity: 4, frequency: "one_off" }, "advisor"));
    const r = must(
      applyOp(
        base.plan,
        {
          op: "price_line",
          id: "l1",
          price: {
            unitPrice: "1200.00",
            currency: "USD",
            evidence: {
              type: "OPERATOR_PRICE_LIST",
              reference: "Kenac price list 2026-10 · UPS-3KVA",
              capturedAt: "2026-10-01",
              supplier: { name: "Kenac Computer Systems", isOperator: true },
            },
          },
        },
        "advisor",
        asOf,
      ),
    );
    expect(r.plan.lines[0].price?.unitPrice).toBe("1200.00");
  });

  it("lets the user enter their own estimate", () => {
    const base = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Hardware", quantity: 4, frequency: "one_off" }, "user"));
    const r = applyOp(
      base.plan,
      { op: "price_line", id: "l1", price: { unitPrice: "1100", currency: "USD", evidence: { type: "USER_ESTIMATE", reference: "T. Moyo", capturedAt: "2026-10-13" } } },
      "user",
      asOf,
    );
    expect(r.ok).toBe(true);
  });

  it("remembers why an initiative was set aside", () => {
    let p = must(applyOp(emptyPlan(), { op: "add_objective", title: "X" }, "advisor")).plan;
    p = must(applyOp(p, { op: "add_initiative", objectiveId: "o1", title: "Copilot for all", disposition: "fund", rationale: "r" }, "advisor")).plan;
    p = must(applyOp(p, { op: "set_state", id: "i2", state: "dismissed", reason: "Board said no AI spend in 2027" }, "user")).plan;
    expect(p.initiatives[0].dismissReason).toBe("Board said no AI spend in 2027");
  });

  it("never shares the allocation unless the line is shared", () => {
    let p = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Hardware", quantity: 4, frequency: "one_off" }, "user")).plan;
    p = must(applyOp(p, { op: "set_sharing", id: "l1", shared: false, shareAllocation: true }, "user")).plan;
    expect(p.lines[0].shareAllocation).toBe(false);
  });
});

describe("demo script", () => {
  it("replays both scripted turns without rejected ops", () => {
    const t1 = scriptedTurn(0);
    const t2 = scriptedTurn(1, t1.plan);
    expect(t2.plan.objectives).toHaveLength(2);
    expect(t2.plan.initiatives).toHaveLength(2);
    expect(t2.plan.lines).toHaveLength(3);
    expect(t2.events.filter((e) => e.type === "op")).toHaveLength(5);
  });
});

describe("priced product", () => {
  it("keeps the Kenac product name, sku and image with the price", () => {
    const base = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Power", quantity: 4, frequency: "one_off" }, "advisor"));
    const r = must(
      applyOp(
        base.plan,
        {
          op: "price_line",
          id: "l1",
          price: {
            unitPrice: "1200.00",
            currency: "USD",
            evidence: { type: "OPERATOR_PRICE_LIST", reference: "Kenac price list 2026-10 · UPS-3KVA", capturedAt: "2026-10-01", supplier: { name: "Kenac Computer Systems", isOperator: true } },
            product: { sku: "UPS-3KVA", name: "3 kVA online UPS", imageUrl: "/catalogue/ups-3kva.webp" },
          },
        },
        "advisor",
        asOf,
      ),
    );
    expect(r.plan.lines[0].price?.product?.imageUrl).toBe("/catalogue/ups-3kva.webp");
  });

  it("rejects a non-https product image", () => {
    const base = must(applyOp(emptyPlan(), { op: "add_line", initiativeId: null, title: "UPS", category: "Power", quantity: 4, frequency: "one_off" }, "advisor"));
    expect(() =>
      applyOp(
        base.plan,
        {
          op: "price_line",
          id: "l1",
          price: {
            unitPrice: "1200.00",
            currency: "USD",
            evidence: { type: "OPERATOR_PRICE_LIST", reference: "x", capturedAt: "2026-10-01" },
            product: { sku: "X", name: "X", imageUrl: "http://example.com/x.png" },
          },
        },
        "advisor",
        asOf,
      ),
    ).toThrow();
  });
});
