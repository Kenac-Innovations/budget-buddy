// Measures live advisor latency and reply length per model and reasoning effort.
// Usage: pnpm exec tsx --tsconfig tsconfig.json scripts/bench-advisor.ts [message]
// Needs OPENAI_API_KEY. Spends a small amount of API credit (one turn per configuration).
import "dotenv/config";
import { runAgent, type AgentOptions } from "@/lib/advisor/agent";
import { InMemorySessionStore } from "@/lib/session/store";

const MESSAGE =
  process.argv[2] ??
  "I am the CIO of a Zimbabwean insurer, about 300 staff across a Harare head office and 6 branches. The board wants us to stop losing customer data to ransomware and to cut downtime. What should 2027 look like?";

const CONFIGS: { model: string; effort: NonNullable<AgentOptions["reasoningEffort"]> }[] = [
  { model: "gpt-6.1-sol", effort: "low" },
  { model: "gpt-5.6-terra", effort: "none" },
];

async function main() {
  for (const { model, effort } of CONFIGS) {
    const store = new InMemorySessionStore();
    const session = await store.create();
    const start = performance.now();
    let firstOp: number | null = null;
    let firstText: number | null = null;
    let text = "";
    let ops = 0;
    let error = "";
    try {
      await runAgent({
        session,
        store,
        message: MESSAGE,
        model,
        reasoningEffort: effort,
        timeoutMs: 120_000,
        emit: (e) => {
          const t = (performance.now() - start) / 1000;
          if (e.type === "op") { ops++; firstOp ??= t; }
          if (e.type === "text") { firstText ??= t; text += e.delta; }
          if (e.type === "error") error = e.message;
        },
      });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const total = (performance.now() - start) / 1000;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const questions = (text.match(/\?/g) ?? []).length;
    console.log(
      `${model.padEnd(14)} ${effort.padEnd(6)} first op ${fmt(firstOp)}  first words ${fmt(firstText)}  total ${total.toFixed(1)}s  ops ${ops}  words ${words}  questions ${questions}${error ? `  ERROR ${error}` : ""}`,
    );
    console.log(`  "${text.trim()}"\n`);
  }
}

const fmt = (s: number | null) => (s === null ? "  -  " : `${s.toFixed(1)}s`);

main();
