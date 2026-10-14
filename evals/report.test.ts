import { describe, expect, it } from "vitest";
import { renderReport } from "./report";
import { loadScenarios } from "./scenarios";
import { emptyPlan } from "../src/lib/plan/types";
import { OPENING_MESSAGE } from "../src/lib/advisor/events";
import type { ScenarioResult } from "./schema";

describe("report evidence", () => {
  it("shows transcript, operations, plans, worst turns, scores and gate failures", async () => {
    const scenario = (await loadScenarios())[5];
    const result: ScenarioResult = { scenario, opening: OPENING_MESSAGE, judge: null, stop: "max_turns", elapsedMs: 10, fixture: true,
      findings: [{ check: "invented_price", turn: 1, detail: "Unsupported amount." }],
      turns: [{ number: 1, user: scenario.opening, text: "US$50000.", before: emptyPlan(), plan: emptyPlan(), events: [], stage: "budget" }] };
    const report = renderReport([result], { mode: "demo", model: "None", baseUrl: "http://localhost:3207", fullSuite: false,
      elapsedMs: 10, cost: "US$0.000000", usage: { input: 0, output: 0, cached: 0 }, timestamp: "2026-10-14T00:00:00Z" });
    expect(report.passed).toBe(false);
    for (const value of ["FAIL", "US$50000", "Worst three", "Final plan", "Not judged", "NOT JUDGED", "Advisor cost: unavailable", "HTTP fixture"]) expect(report.markdown).toContain(value);
    expect(report.markdown.indexOf("Unsupported amount")).toBeLessThan(report.markdown.indexOf("No hard violation"));
  });
});
