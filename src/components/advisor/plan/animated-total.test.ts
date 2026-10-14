import { afterEach, expect, it, vi } from "vitest";
import { applyOp } from "@/lib/plan/ops";
import { planTotals } from "@/lib/plan/totals";
import { scriptedTurn } from "@/lib/advisor/fixtures";

const control = vi.hoisted(() => ({ node: { textContent: "" }, reduced: false }));
vi.mock("react", async importOriginal => ({
  ...await importOriginal<typeof import("react")>(),
  useRef: (initial: unknown) => ({ current: initial === null ? control.node : initial }),
  useLayoutEffect: (effect: () => unknown) => { effect(); },
}));
import { AnimatedTotal } from "./budget-hud";

function acceptedTotal() {
  let plan = scriptedTurn(1, scriptedTurn(0, undefined, true).plan, true).plan;
  for (const line of plan.lines.filter(line => line.price)) {
    const result = applyOp(plan, { op: "set_state", id: line.id, state: "accepted" }, "user");
    if (!result.ok) throw new Error(result.error);
    plan = result.plan;
  }
  return planTotals(plan);
}
function setup(reduced: boolean) {
  control.reduced = reduced;
  control.node.textContent = "";
  vi.stubGlobal("matchMedia", () => ({ matches: control.reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}
afterEach(() => vi.unstubAllGlobals());
it("starts the eased number response before paint using the engine's target", () => {
  setup(false);
  const totals = acceptedTotal();
  AnimatedTotal({ value: totals.reportingTotal, currency: totals.reportingCurrency });
  expect(control.node.textContent).toMatch(/^US\$[1-9]/);
  expect(control.node.textContent).not.toBe("US$22,440");
  expect(requestAnimationFrame).toHaveBeenCalledOnce();
});
it("writes the final engine total synchronously without scheduling movement under reduced motion", () => {
  setup(true);
  const totals = acceptedTotal();
  AnimatedTotal({ value: totals.reportingTotal, currency: totals.reportingCurrency });
  expect(control.node.textContent).toBe("US$22,440");
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});
