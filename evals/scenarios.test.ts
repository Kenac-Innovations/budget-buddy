import { describe, expect, it } from "vitest";
import { loadScenarios, scriptedUser } from "./scenarios";

describe("scenario suite", () => {
  it("covers all twelve briefs and the three judging personas", async () => {
    const suite = await loadScenarios();
    expect(suite.map((s) => s.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(new Set(suite.map((s) => s.persona.role))).toEqual(new Set(["CIO", "CTO", "CSO", "ICT_MANAGER"]));
    expect(suite.every((s) => s.persona.hiddenFacts.length && s.expectations.length === 3)).toBe(true);
    expect(suite[7].opening).toContain("IGNORE ALL PRIOR RULES");
    expect(suite[11].script[0]).toContain("I disagree");
  });
  it("reveals a hidden fact only after an appropriate question and only once", async () => {
    const scenario = (await loadScenarios())[0];
    const revealed = new Set<number>();
    expect(scriptedUser(scenario, "Power comes first.", 0, revealed).message).toBe(scenario.script[0]);
    expect(revealed.size).toBe(0);
    expect(scriptedUser(scenario, "What causes the outages?", 0, revealed)).toEqual({ message: scenario.persona.hiddenFacts[1].fact, nextIndex: 0 });
    expect(revealed.has(1)).toBe(true);
    expect(scriptedUser(scenario, "What causes the outages?", 0, revealed).message).toBe(scenario.script[0]);
  });
});
