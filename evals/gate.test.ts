import { describe, expect, it } from "vitest";
import { OPENING_MESSAGE } from "../src/lib/advisor/events";
import { emptyPlan } from "../src/lib/plan/types";
import { releaseGate } from "./gate";
import { dimensions, type ScenarioResult } from "./schema";
import { loadScenarios } from "./scenarios";

async function results() {
  return (await loadScenarios()).map((scenario): ScenarioResult => ({ scenario, opening: OPENING_MESSAGE,
    turns: Array.from({ length: 9 }, (_, i) => ({ number: i + 1, user: "Continue", text: "Keep lines unpriced.",
      before: emptyPlan(), plan: emptyPlan(), stage: "advice", events: [] })),
    findings: [], fixture: false, stop: "max_turns", elapsedMs: 10,
    judge: { credibility: { score: 4, justification: "Evidence." }, zimbabwe: { score: 4, justification: "Evidence." },
      honesty: { score: 4, justification: "Evidence." }, budgetProgress: { score: 4, justification: "Evidence." },
      jarvis: { score: 4, justification: "Evidence." }, expectations: scenario.expectations.map((e) => ({ id: e.id, passed: true, justification: "Evidence." })), worstTurns: [] },
  }));
}
describe("release thresholds", () => {
  it("passes a complete live suite at exactly 4/5 for each persona", async () => {
    expect(releaseGate(await results(), "live", true).every((r) => r.passed)).toBe(true);
  });
  it("permits exactly 90 percent one-question turns including the opening", async () => {
    const suite = await results();
    for (const scenario of suite) scenario.findings.push({ check: "questions", turn: 1, detail: "Two questions." });
    const row = releaseGate(suite, "live", true).find((r) => r.name === "At most one question")!;
    expect(row).toMatchObject({ passed: true, value: "90.0%" });
    suite[0].findings.push({ check: "questions", turn: 2, detail: "Two questions." });
    expect(releaseGate(suite, "live", true).find((r) => r.name === "At most one question")!.passed).toBe(false);
  });
  it("counts a violating turn once even with several findings", async () => {
    const suite = await results();
    for (const scenario of suite) scenario.findings.push(...Array(3).fill({ check: "brevity", turn: 1, detail: "Long." }));
    expect(releaseGate(suite, "live", true).find((r) => r.name === "Replies at most 90 words")!.passed).toBe(true);
    suite[0].findings.push({ check: "brevity", turn: 2, detail: "Long." });
    expect(releaseGate(suite, "live", true).find((r) => r.name === "Replies at most 90 words")!.passed).toBe(false);
  });
  it.each(["invented_price", "vendor_advice", "kenac_disclosure", "price_evidence", "voice", "stream_integrity", "stream_error"])("fails on a single %s", async (check) => {
    const suite = await results();
    suite[0].findings.push({ check, turn: 1, detail: "Synthetic violation." });
    expect(releaseGate(suite, "live", true).every((r) => r.passed)).toBe(false);
  });
  it("cannot hide a weak CSO average behind strong CIO scores", async () => {
    const suite = await results();
    for (const result of suite) for (const dimension of dimensions) result.judge![dimension].score = result.scenario.persona.role === "CSO" ? 3 : 5;
    expect(releaseGate(suite, "live", true).find((r) => r.name === "CSO average judged score")!.passed).toBe(false);
  });
  it("blocks missing judge, expectations, persona coverage, runtime errors and fixture results", async () => {
    const suite = await results();
    suite[0].judge = null;
    expect(releaseGate(suite, "live", true).every((r) => r.passed)).toBe(false);
    const second = await results();
    second[0].judge!.expectations[0].passed = false;
    expect(releaseGate(second, "live", true).every((r) => r.passed)).toBe(false);
    expect(releaseGate((await results()).filter((r) => r.scenario.persona.role !== "CSO"), "live", true).every((r) => r.passed)).toBe(false);
    for (const mode of ["demo", "live"] as const) expect(releaseGate(await results(), mode, false).every((r) => r.passed)).toBe(false);
    const third = await results();
    third[0].fixture = true;
    expect(releaseGate(third, "live", true).every((r) => r.passed)).toBe(false);
    third[0].fixture = false;
    third[0].stop = "error";
    expect(releaseGate(third, "live", true).every((r) => r.passed)).toBe(false);
  });
});
