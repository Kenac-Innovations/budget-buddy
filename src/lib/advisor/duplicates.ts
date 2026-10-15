import type { Plan } from "@/lib/plan/types";

/**
 * Near-duplicate detection for advisor-added plan items. Live evals showed the advisor adding a
 * second, overlapping assessment instead of updating the first; the tools now reject that and
 * point it at the existing item. Dismissed items are ignored (the user set them aside).
 */
const STOP = new Set(["a", "an", "and", "the", "of", "for", "to", "in", "on", "at", "with", "by", "per", "all", "new", "plan"]);

function words(title: string): Set<string> {
  return new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(ies|es|s)$/, "")));
}

export function similar(a: string, b: string): boolean {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return false;
  const shared = [...x].filter((w) => y.has(w)).length;
  const jaccard = shared / new Set([...x, ...y]).size;
  const contained = shared === Math.min(x.size, y.size) && Math.min(x.size, y.size) >= 2;
  return jaccard >= 0.6 || contained;
}

type Addition =
  | { op: "add_objective"; title: string }
  | { op: "add_initiative"; title: string; objectiveId: string }
  | { op: "add_line"; title: string; initiativeId: string | null };

/** Returns an existing item the addition would duplicate, or null. */
export function duplicateOf(plan: Plan, add: Addition): { id: string; title: string; kind: string } | null {
  const live = <T extends { state: string }>(items: T[]) => items.filter((i) => i.state !== "dismissed");
  if (add.op === "add_objective") {
    const hit = live(plan.objectives).find((o) => similar(o.title, add.title));
    return hit ? { id: hit.id, title: hit.title, kind: "objective" } : null;
  }
  if (add.op === "add_initiative") {
    const hit = live(plan.initiatives).find((i) => i.objectiveId === add.objectiveId && similar(i.title, add.title));
    return hit ? { id: hit.id, title: hit.title, kind: "initiative" } : null;
  }
  const hit = live(plan.lines).find((l) => l.initiativeId === add.initiativeId && similar(l.title, add.title));
  return hit ? { id: hit.id, title: hit.title, kind: "line" } : null;
}
