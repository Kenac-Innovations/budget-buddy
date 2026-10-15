import { z } from "zod";
import { OPENING_MESSAGE } from "../src/lib/advisor/events";
import { emptyPlan } from "../src/lib/plan/types";
import { checkOpening, checkTurn, loadVendors } from "./checks";
import { loadScenarios, scriptedUser } from "./scenarios";
import { LiveModels, evalCost } from "./models";
import { AdvisorTransport, inferStage } from "./transport";
import { saveReport } from "./report";
import type { Scenario, ScenarioResult, UserDecision } from "./schema";

const Options = z.object({ mode: z.enum(["demo", "live"]), scenario: z.coerce.number().int().positive().optional(),
  baseUrl: z.string().url().refine((url) => /^https?:/.test(url)), });
export function parseOptions(args: string[], env: Readonly<Record<string, string | undefined>> = process.env) {
  const values: Record<string, string> = { mode: "demo", baseUrl: env.EVAL_BASE_URL ?? "http://localhost:3207" };
  const keys: Record<string, string> = { "--mode": "mode", "--scenario": "scenario", "--base-url": "baseUrl" };
  for (let i = 0; i < args.length; i += 2) {
    const key = keys[args[i]];
    if (!key || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Usage: pnpm eval [--scenario n] [--mode demo|live] [--base-url http://localhost:3207]");
    values[key] = args[i + 1];
  }
  const parsed = Options.parse(values);
  const target = new URL(parsed.baseUrl);
  if (target.username || target.password || target.search || target.hash || target.pathname !== "/") throw new Error("Base URL must be an origin without credentials or query parameters.");
  return parsed;
}

export async function runScenario(scenario: Scenario, options: {
  mode: "demo" | "live"; baseUrl: string; vendors: string[]; signal: AbortSignal;
  models?: Pick<LiveModels, "user" | "judge">; transport?: AdvisorTransport;
}): Promise<ScenarioResult> {
  const start = Date.now();
  const result: ScenarioResult = { scenario, opening: OPENING_MESSAGE, turns: [], findings: checkOpening(OPENING_MESSAGE),
    judge: null, stop: "max_turns", fixture: false, elapsedMs: 0 };
  const transport = options.transport ?? new AdvisorTransport(options.baseUrl);
  let message = scenario.opening;
  let plan = emptyPlan();
  let scriptIndex = 0;
  const revealed = new Set<number>();
  let pendingDecisions: UserDecision[] = [];
  try {
    for (let number = 1; number <= scenario.maxTurns; number++) {
      const signal = AbortSignal.any([options.signal, AbortSignal.timeout(65_000)]);
      const response = await transport.turn(message, signal);
      result.fixture ||= response.fixture;
      const stage = inferStage(message, response.events);
      const turn = { number, user: message, before: plan, ...response, stage, ...(pendingDecisions.length ? { decisions: pendingDecisions } : {}) };
      pendingDecisions = [];
      result.turns.push(turn);
      result.findings.push(...checkTurn({ ...turn, userMessages: result.turns.map((t) => t.user), vendors: options.vendors }));
      plan = response.plan;
      if (response.events.some((event) => event.type === "error")) throw new Error("Advisor emitted an error.");
      if (response.events.some((event) => event.type === "wrap_up")) { result.stop = "wrap_up"; break; }
      if (number === scenario.maxTurns) break;
      if (options.mode === "demo") {
        const reply = scriptedUser(scenario, response.text, scriptIndex, revealed);
        message = reply.message;
        scriptIndex = reply.nextIndex;
      } else {
        if (!options.models) throw new Error("Live clients missing.");
        const reply = await options.models.user(scenario, result, signal);
        // Decisions go through the same user endpoint as the UI buttons; the runner never edits plan JSON.
        for (const decision of reply.decisions) {
          const decided = await transport.decide({ op: "set_state", id: decision.id,
            state: decision.action === "accept" ? "accepted" : "dismissed",
            ...(decision.action === "set_aside" && decision.reason ? { reason: decision.reason } : {}) }, signal);
          if (decided) { plan = decided; pendingDecisions.push(decision); }
        }
        if (reply.goalMet) { result.stop = "goal_met"; break; }
        message = reply.message;
      }
    }
    if (options.mode === "live") {
      if (!options.models) throw new Error("Live judge missing.");
      result.judge = await options.models.judge(result, AbortSignal.any([options.signal, AbortSignal.timeout(process.env.EVAL_JUDGE === "codex" ? 300_000 : 65_000)]));
    }
  } catch {
    // Never log provider errors or server bodies: they may contain message text or identifiers.
    result.stop = "error";
    result.error = options.signal.aborted ? "Run deadline exceeded; remaining evidence unavailable." : "Scenario failed: HTTP, stream or model validation error. Inspect synthetic transcript and server configuration.";
  }
  result.elapsedMs = Date.now() - start;
  return result;
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help") || args.includes("-h")) {
    process.stdout.write("Usage: pnpm eval [--scenario n] [--mode demo|live] [--base-url http://localhost:3208]\nDemo uses scripted users; live requires OPENAI_API_KEY and an account-confirmed OPENAI_MODEL.\n");
    return 0;
  }
  const options = parseOptions(args);
  const all = await loadScenarios();
  const scenarios = options.scenario ? all.filter((s) => s.id === options.scenario) : all;
  if (!scenarios.length) throw new Error("Unknown scenario id.");
  if (options.mode === "live" && !process.env.OPENAI_API_KEY) throw new Error("Live mode requires OPENAI_API_KEY. Use --mode demo for keyless checks.");
  const model = process.env.OPENAI_EVAL_MODEL ?? process.env.OPENAI_MODEL;
  if (options.mode === "live" && !model) throw new Error("Configure OPENAI_MODEL or OPENAI_EVAL_MODEL with an account-confirmed model id.");
  const models = options.mode === "live" ? new LiveModels(model!) : undefined;
  const vendors = await loadVendors();
  const start = Date.now();
  const results: ScenarioResult[] = [];
  // Three isolated scenarios in parallel, a 14-minute suite deadline, no SDK retries.
  // Deadline failures fail the report rather than silently dropping slow scenarios.
  const signal = AbortSignal.timeout((process.env.EVAL_JUDGE === "codex" ? 30 : 14) * 60_000);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, scenarios.length) }, async () => {
    while (cursor < scenarios.length) {
      const scenario = scenarios[cursor++];
      const result = await runScenario(scenario, { ...options, vendors, models, signal });
      results.push(result);
      process.stdout.write(`Scenario ${scenario.id}: ${result.stop}; ${result.findings.length} hard findings\n`);
    }
  }));
  results.sort((a, b) => a.scenario.id - b.scenario.id);
  const usage = models?.usage ?? { input: 0, cached: 0, output: 0 };
  const cost = evalCost(usage, options.mode);
  const report = await saveReport(results, { ...options, fullSuite: scenarios.length === all.length,
    model: options.mode === "demo" ? "None (scripted demo)" : model!, timestamp: new Date().toISOString(), elapsedMs: Date.now() - start, cost, usage });
  process.stdout.write(`Eval-client cost: ${cost}\nAdvisor cost / total live-run cost: unavailable (no advisor usage event)\nReport: ${report.path}\nRelease gate: ${report.passed ? "PASS" : "FAIL"}\n`);
  return report.passed ? 0 : 1;
}
