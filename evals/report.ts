import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dimensions, type ScenarioResult } from "./schema";
import { releaseGate } from "./gate";
import type { ModelUsage } from "./models";

export interface ReportMeta {
  mode: "demo" | "live"; baseUrl: string; model: string; fullSuite: boolean; elapsedMs: number;
  cost: string; usage: ModelUsage; timestamp: string;
}
const cell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const quote = (value: string) => value.replaceAll("<", "&lt;").replaceAll(">", "&gt;").split("\n").map((line) => `> ${line}`).join("\n");
const block = (data: unknown) => {
  const content = JSON.stringify(data, null, 2);
  const fence = "`".repeat(Math.max(3, ...[...content.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}json\n${content}\n${fence}`;
};

export function renderReport(results: ScenarioResult[], meta: ReportMeta) {
  const gate = releaseGate(results, meta.mode, meta.fullSuite);
  const passed = gate.every((row) => row.passed);
  const lines = [
    `# Budget Buddy advisor eval · ${meta.timestamp}`, "",
    `Release gate: **${passed ? "PASS" : "FAIL"}**`, "",
    `Mode: ${meta.mode}. Target: ${meta.baseUrl}. Eval model: ${meta.model}. Duration: ${(meta.elapsedMs / 1000).toFixed(1)}s.`, "",
    `Eval-client cost: ${meta.cost}. Advisor cost: unavailable (the frozen NDJSON contract carries no usage). Total live-run cost: unavailable.`, "",
    `Eval tokens: ${meta.usage.input} input (${meta.usage.cached} cached), ${meta.usage.output} output.`, "",
    "Demo uses a scripted user and no LLM judge. Demo and selected-scenario runs are diagnostics and cannot certify a release.", "",
    "The primary thresholds below match build-plan section 1; additional T7 checks and run completeness also block release.", "",
    "| Check | Result | Observed | Requirement |", "| --- | --- | --- | --- |",
    ...gate.map((row) => `| ${row.name} | ${row.passed ? "PASS" : "FAIL"} | ${cell(row.value)} | ${row.requirement} |`), "",
    "## Worst three advisor turns", "",
  ];
  const candidates = results.flatMap((r) => [
    { result: r, number: 0, text: r.opening },
    ...r.turns.map((t) => ({ result: r, number: t.number, text: t.text })),
  ]).map((item) => {
    const findings = item.result.findings.filter((f) => f.turn === item.number);
    const judge = item.result.judge?.worstTurns.find((t) => t.turn === item.number);
    return { ...item, severity: findings.reduce((n, f) => n + (/invented_price|price_evidence|vendor_advice/.test(f.check) ? 100 : 10), 0) + (judge ? 5 : 0),
      reason: [...findings.map((f) => `${f.check}: ${f.detail}`), ...(judge ? [judge.reason] : [])].join("; ") };
  }).sort((a, b) => b.severity - a.severity || a.result.scenario.id - b.result.scenario.id || a.number - b.number).slice(0, 3);
  for (const turn of candidates) lines.push(
    `### Scenario ${turn.result.scenario.id}, turn ${turn.number}`, "",
    turn.reason || "No hard violation. Unranked diagnostic sample; no judge evidence of relative quality.", "", quote(turn.text || "[No advisor text]"), "",
  );
  for (const result of results) {
    lines.push(`## ${result.scenario.id}. ${result.scenario.name} · ${result.scenario.persona.role}`, "",
      `Goal: ${result.scenario.goal}`, "", `Stopped: ${result.stop}. Duration: ${(result.elapsedMs / 1000).toFixed(1)}s. Target: ${result.fixture ? "HTTP fixture" : "advisor"}.`, "");
    if (result.error) lines.push(`Error: ${result.error}`, "");
    lines.push("| Dimension | Score | Justification |", "| --- | --- | --- |",
      ...dimensions.map((d) => `| ${d} | ${result.judge?.[d].score ?? "Not judged"} | ${cell(result.judge?.[d].justification ?? "Demo or judge unavailable; no quality score fabricated.")} |`), "",
      "| Expectation | Result | Evidence |", "| --- | --- | --- |");
    for (const expectation of result.scenario.expectations) {
      const assessed = result.judge?.expectations.find((e) => e.id === expectation.id);
      lines.push(`| ${cell(expectation.description)} | ${assessed ? assessed.passed ? "PASS" : "FAIL" : "NOT JUDGED"} | ${cell(assessed?.justification ?? "Live judge required.")} |`);
    }
    lines.push("", "### Hard findings", "");
    if (!result.findings.length) lines.push("No hard-check violations.", "");
    else lines.push(...result.findings.map((f) => `- Turn ${f.turn}: ${f.check} — ${f.detail}`), "");
    lines.push("### Transcript", "", "Advisor opening (turn 0):", "", quote(result.opening), "");
    for (const turn of result.turns) {
      lines.push(`User (turn ${turn.number}):`, "", quote(turn.user), "", `Advisor (${turn.stage}):`, "", quote(turn.text), "",
        "Stream operations and wrap-up:", "", block(turn.events.filter((e) => e.type === "op" || e.type === "wrap_up" || e.type === "error")), "");
    }
    lines.push("### Final plan", "", block(result.turns.at(-1)?.plan ?? null), "");
  }
  return { markdown: lines.join("\n"), passed };
}

export async function saveReport(results: ScenarioResult[], meta: ReportMeta, directory = fileURLToPath(new URL("./reports", import.meta.url))) {
  await mkdir(directory, { recursive: true });
  const path = `${directory}/${meta.timestamp.replaceAll(":", "-")}.md`;
  const report = renderReport(results, meta);
  await writeFile(path, report.markdown, { encoding: "utf8", mode: 0o600 });
  return { path, passed: report.passed };
}
