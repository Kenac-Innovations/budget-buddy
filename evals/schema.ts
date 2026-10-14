import { z } from "zod";
import type { AdvisorEvent } from "../src/lib/advisor/events";
import type { Plan } from "../src/lib/plan/types";

export const Scenario = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  persona: z.object({
    role: z.enum(["CIO", "CTO", "CSO", "ICT_MANAGER"]),
    organisation: z.string().min(1),
    temperament: z.string().min(1),
    hiddenFacts: z.array(z.object({
      askedAbout: z.string().min(1),
      fact: z.string().min(1),
      trigger: z.string().min(1),
    })),
  }),
  goal: z.string().min(1),
  maxTurns: z.number().int().min(2).max(10),
  opening: z.string().min(1).max(4000),
  script: z.array(z.string().min(1).max(4000)).min(1),
  expectations: z.array(z.object({ id: z.string().min(1), description: z.string().min(1) })).min(1),
});
export type Scenario = z.infer<typeof Scenario>;
export const dimensions = ["credibility", "zimbabwe", "honesty", "budgetProgress", "jarvis"] as const;
const Score = z.object({ score: z.number().int().min(1).max(5), justification: z.string().min(1).max(600) });
export const JudgeResult = z.object({
  credibility: Score,
  zimbabwe: Score,
  honesty: Score,
  budgetProgress: Score,
  jarvis: Score,
  expectations: z.array(z.object({ id: z.string(), passed: z.boolean(), justification: z.string().min(1).max(600) })),
  worstTurns: z.array(z.object({ turn: z.number().int().nonnegative(), reason: z.string().min(1).max(600) })).max(3),
});
export type JudgeResult = z.infer<typeof JudgeResult>;
export const UserReply = z.object({ message: z.string().min(1).max(4000), goalMet: z.boolean() });
export type Stage = "advice" | "budget" | "wrap_up";
export interface Turn {
  number: number;
  user: string;
  text: string;
  events: AdvisorEvent[];
  before: Plan;
  plan: Plan;
  stage: Stage;
}
export interface Finding { check: string; turn: number; detail: string }
export interface ScenarioResult {
  scenario: Scenario;
  opening: string;
  turns: Turn[];
  findings: Finding[];
  judge: JudgeResult | null;
  stop: "wrap_up" | "goal_met" | "max_turns" | "error";
  error?: string;
  fixture: boolean;
  elapsedMs: number;
}
