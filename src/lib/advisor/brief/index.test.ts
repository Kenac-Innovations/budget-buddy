import { expect, it } from "vitest";
import { getTrendBrief, TOPIC_FILES } from ".";

it("loads twelve stable dated drafts with each required section", () => {
  const brief = getTrendBrief();
  expect(TOPIC_FILES).toHaveLength(12);
  expect(getTrendBrief()).toBe(brief);
  const topics = brief.split("\n\n---\n\n");
  expect(topics).toHaveLength(12);
  for (const topic of topics) {
    expect(topic).toContain("Status: DRAFT, awaiting Kenac review");
    expect(topic).toContain("Review date: 2026-10-14");
    for (const section of ["What it is", "Who it fits in Zimbabwe", "When it is hype or premature, and prerequisites", "Common failures", "Questions to ask", "Sources with dates"]) expect(topic).toContain(`## ${section}`);
    expect(topic).toMatch(/https:\/\//);
    expect(topic).not.toMatch(/\$\d|US\$|USD\s*\d/);
  }
  expect(brief).toContain("2025-10-14");
});
