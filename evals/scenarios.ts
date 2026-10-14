import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Scenario } from "./schema";

export async function loadScenarios(directory = fileURLToPath(new URL("./scenarios", import.meta.url))) {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  const scenarios = await Promise.all(names.map(async (name) => Scenario.parse(JSON.parse(await readFile(`${directory}/${name}`, "utf8")))));
  if (scenarios.length < 12 || new Set(scenarios.map((s) => s.id)).size !== scenarios.length) {
    throw new Error("The suite requires at least 12 scenarios with unique ids.");
  }
  for (const scenario of scenarios) {
    if (new Set(scenario.expectations.map((e) => e.id)).size !== scenario.expectations.length) throw new Error("Duplicate expectation id.");
    for (const fact of scenario.persona.hiddenFacts) new RegExp(fact.trigger, "i");
  }
  return scenarios.sort((a, b) => a.id - b.id);
}

/** Demo users reveal hidden facts only in response to a matching question. */
export function scriptedUser(scenario: Scenario, advisor: string, scriptIndex: number, revealed: Set<number>) {
  if (advisor.includes("?")) {
    const index = scenario.persona.hiddenFacts.findIndex((fact, i) => !revealed.has(i) && new RegExp(fact.trigger, "i").test(advisor));
    if (index >= 0) {
      revealed.add(index);
      return { message: scenario.persona.hiddenFacts[index].fact, nextIndex: scriptIndex };
    }
  }
  return { message: scenario.script[Math.min(scriptIndex, scenario.script.length - 1)], nextIndex: scriptIndex + 1 };
}
