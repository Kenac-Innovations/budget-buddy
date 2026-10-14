import { z } from "zod";
import { Plan } from "@/lib/plan/types";
import { planTotals } from "@/lib/plan/totals";
import type { ContactDetails } from "@/lib/session/store";

export const SharedRow = z.object({
  lineId: z.string(),
  item: z.string(), quantity: z.number().positive().nullable(), unit: z.string().nullable(),
  timing: z.string(), frequency: z.string(), category: z.string(), notes: z.string().nullable(),
  organisation: z.string().optional(),
  contact: z.object({ name: z.string(), email: z.string().email(), role: z.string() }).optional(),
  allocation: z.object({ amount: z.string().nullable(), currency: z.string(), status: z.enum(["Priced", "Unpriced"]) }).optional(),
  sharedAt: z.string().datetime().nullable(),
}).strict();
export type SharedRow = z.infer<typeof SharedRow>;

/** The only data projection used by preview, Kenac HTML and CSV. Private fields are absent. */
export function sharedRows(input: Plan, contact: ContactDetails | null, dates: Record<string, string> = {}): SharedRow[] {
  const plan = Plan.parse(input);
  const totals = planTotals(plan);
  return plan.lines.filter((line) => line.state === "accepted" && line.sharedWithKenac).map((line) => {
    const result = totals.lines.find((r) => r.id === line.id)!;
    return SharedRow.parse({
      lineId: line.id, item: line.title, quantity: line.quantity, unit: line.unit ?? null,
      timing: line.paymentMonth ?? plan.profile.periodStart, frequency: line.frequency,
      category: line.category, notes: line.note ?? null, sharedAt: dates[line.id] ?? null,
      ...(contact?.consentContact ? { organisation: contact.organisation, contact: { name: contact.name, email: contact.email, role: contact.role } } : {}),
      ...(line.shareAllocation ? { allocation: { amount: result.total?.toFixed(2) ?? null, currency: result.currency, status: result.status === "priced" ? "Priced" : "Unpriced" } } : {}),
    });
  });
}

export const CSV_HEADERS = ["Item", "Quantity", "Unit", "Timing", "Frequency", "Category", "Notes", "Organisation", "Contact name", "Contact email", "Contact role", "Allocation", "Currency", "Shared date"];
export function sharedRowValues(row: SharedRow): (string | number | null)[] {
  return [row.item, row.quantity, row.unit, row.timing, row.frequency.replaceAll("_", " "), row.category, row.notes,
    row.organisation ?? null, row.contact?.name ?? null, row.contact?.email ?? null, row.contact?.role ?? null,
    row.allocation ? row.allocation.amount ?? "Unpriced" : null, row.allocation?.currency ?? null, row.sharedAt];
}

/** Quoted CSV still executes formulas in Excel, so neutralise leading formula characters. */
export function sharingCsv(rows: SharedRow[]): string {
  const escape = (value: string | number | null) => {
    let text = String(value ?? "");
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return "\uFEFF" + [CSV_HEADERS, ...rows.map((r) => sharedRowValues(SharedRow.parse(r)))].map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}
