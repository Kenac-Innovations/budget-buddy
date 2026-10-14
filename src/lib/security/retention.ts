import { z } from "zod";

const dateSchema = z.date();
export function retentionCutoff(now = new Date()) {
  return new Date(dateSchema.parse(now).getTime() - 30 * 24 * 60 * 60 * 1000);
}

/** Keep the predicate in the DELETE itself so a concurrent save cannot be erased. */
export async function deleteExpiredSessions(
  database: { query(sql: string, values: Date[]): Promise<{ rowCount: number | null }> },
  now = new Date(),
) {
  const result = await database.query(
    'DELETE FROM "AdvisorSession" WHERE "savedAt" IS NULL AND "updatedAt" < $1',
    [retentionCutoff(now)],
  );
  return z.number().int().nonnegative().parse(result.rowCount ?? 0);
}
