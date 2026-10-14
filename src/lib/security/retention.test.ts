import { expect, it } from "vitest";
import { deleteExpiredSessions, retentionCutoff } from "./retention";
it("deletes only unsaved stale fixtures, preserving saved and cutoff-boundary records", async () => {
  const now = new Date("2026-10-13T00:00:00Z");
  const cutoff = retentionCutoff(now);
  const records = [
    { id: "old", savedAt: null, updatedAt: new Date(cutoff.getTime() - 1) },
    { id: "boundary", savedAt: null, updatedAt: cutoff },
    { id: "recent", savedAt: null, updatedAt: now },
    { id: "saved", savedAt: now, updatedAt: new Date("2020-01-01") },
  ];
  const database = { async query(sql: string, dates: Date[]) {
    expect(sql).toBe('DELETE FROM "AdvisorSession" WHERE "savedAt" IS NULL AND "updatedAt" < $1');
    const expired = records.filter((row) => row.savedAt === null && row.updatedAt < dates[0]);
    for (const row of expired) records.splice(records.indexOf(row), 1);
    return { rowCount: expired.length };
  } };
  expect(await deleteExpiredSessions(database, now)).toBe(1);
  expect(records.map((row) => row.id)).toEqual(["boundary", "recent", "saved"]);
  expect(await deleteExpiredSessions(database, now)).toBe(0);
});
