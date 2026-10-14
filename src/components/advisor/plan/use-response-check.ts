import { useLayoutEffect, useRef } from "react";
import type { PlanOp } from "@/lib/plan/ops";

/** Opt-in local QA only: records DOM response timing, operation types and booleans, never plan text. */
export function useResponseCheck(version: number, persist: (op: PlanOp) => Promise<boolean>) {
  const pending = useRef<null | { start: number; op: string; id?: string; total: string; ring: string; timeline: string; visibleTotal: string }>(null);
  useLayoutEffect(() => {
    const check = pending.current;
    if (!check) return;
    pending.current = null;
    const budget = document.querySelector<HTMLElement>(".bb-hud-budget");
    if (!budget) return;
    const commitMs = performance.now() - check.start;
    const frame = requestAnimationFrame(() => {
      const records = JSON.parse(budget.dataset.responseChecks ?? "[]") as unknown[];
      records.push({ op: check.op, id: check.id, commitMs: Number(commitMs.toFixed(2)),
        totalChanged: check.total !== budget.dataset.total,
        numberStarted: check.visibleTotal !== budget.querySelector(".bb-hud-total")?.textContent,
        ringChanged: check.ring !== budget.querySelector(".bb-hud-ring")?.innerHTML,
        timelineChanged: check.timeline !== budget.querySelector(".bb-hud-timeline svg")?.innerHTML });
      budget.dataset.responseChecks = JSON.stringify(records.slice(-100));
    });
    return () => cancelAnimationFrame(frame);
  }, [version]);
  return (op: PlanOp) => {
    if ((location.hostname === "localhost" || location.hostname === "127.0.0.1") && new URLSearchParams(location.search).has("hud-checks")) {
      const budget = document.querySelector<HTMLElement>(".bb-hud-budget");
      if (budget) pending.current = { start: performance.now(), op: op.op, id: "id" in op ? op.id : undefined,
        total: budget.dataset.total ?? "", ring: budget.querySelector(".bb-hud-ring")?.innerHTML ?? "",
        timeline: budget.querySelector(".bb-hud-timeline svg")?.innerHTML ?? "", visibleTotal: budget.querySelector(".bb-hud-total")?.textContent ?? "" };
    }
    return persist(op);
  };
}
