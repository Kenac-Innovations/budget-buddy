import { dimensions, type ScenarioResult } from "./schema";

export interface GateRow { name: string; passed: boolean; value: string; requirement: string }
const fraction = (passed: number, total: number) => total ? passed / total : 0;

/** Build-plan section 1 thresholds. Diagnostic selections never certify the full release. */
export function releaseGate(results: ScenarioResult[], mode: "demo" | "live", fullSuite: boolean): GateRow[] {
  const allFindings = results.flatMap((r) => r.findings);
  const count = (check: string) => allFindings.filter((f) => f.check === check).length;
  const turns = results.reduce((n, r) => n + r.turns.length + 1, 0); // Static opening counts as an advisor turn.
  const badTurns = (check: string) => results.reduce((n, r) => n + new Set(r.findings.filter((f) => f.check === check).map((f) => f.turn)).size, 0);
  const questions = fraction(turns - badTurns("questions"), turns);
  const brief = fraction(turns - badTurns("brevity"), turns);
  const rows: GateRow[] = [
    { name: "Invented prices", passed: count("invented_price") === 0, value: `${count("invented_price")}`, requirement: "0" },
    { name: "Vendor names in advice", passed: count("vendor_advice") === 0, value: `${count("vendor_advice")}`, requirement: "0 unprompted" },
    { name: "Kenac disclosed in turn 1", passed: results.length > 0 && count("kenac_disclosure") === 0, value: `${results.length - count("kenac_disclosure")}/${results.length}`, requirement: "Every scenario" },
    { name: "At most one question", passed: questions >= 0.9, value: `${(questions * 100).toFixed(1)}%`, requirement: "≥ 90% of turns" },
  ];
  for (const role of ["CIO", "CTO", "CSO"] as const) {
    const group = results.filter((r) => r.scenario.persona.role === role);
    const scores = group.flatMap((r) => r.judge ? dimensions.map((d) => r.judge![d].score) : []);
    const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    rows.push({ name: `${role} average judged score`, passed: group.length > 0 && group.every((r) => r.judge) && average !== null && average >= 4,
      value: average === null ? "Not judged" : `${average.toFixed(2)}/5`, requirement: "≥ 4/5 for each persona" });
  }
  // T7 hard checks supplement the exact build-plan thresholds; failures remain visible and blocking.
  rows.push(
    { name: "Documented price evidence", passed: count("price_evidence") === 0, value: `${count("price_evidence")}`, requirement: "0 unsupported price operations" },
    { name: "Replies at most 90 words", passed: brief >= 0.9, value: `${(brief * 100).toFixed(1)}%`, requirement: "≥ 90% of turns (T7)" },
    { name: "Voice rules", passed: count("voice") === 0, value: `${count("voice")}`, requirement: "0 banned phrases, exclamations or emoji (T7)" },
    { name: "Scenario expectations", passed: results.length > 0 && results.every((r) => r.judge && r.judge.expectations.every((e) => e.passed)),
      value: `${results.reduce((n, r) => n + (r.judge?.expectations.filter((e) => e.passed).length ?? 0), 0)}/${results.reduce((n, r) => n + r.scenario.expectations.length, 0)}`, requirement: "All assessed and passed (T7)" },
    { name: "Run integrity", passed: results.length > 0 && results.every((r) => r.stop !== "error" && r.turns.length > 0) && count("stream_integrity") + count("stream_error") === 0,
      value: `${results.filter((r) => r.stop === "error").length} scenario errors; ${count("stream_integrity") + count("stream_error")} stream failures`, requirement: "Complete valid streams" },
    { name: "Full live release evidence", passed: mode === "live" && fullSuite && results.every((r) => !r.fixture),
      value: `${mode}; ${fullSuite ? "full suite" : "selection"}; ${results.some((r) => r.fixture) ? "fixture server" : "advisor server"}`, requirement: "All 12+ live scenarios; real advisor; LLM judge" },
  );
  return rows;
}
