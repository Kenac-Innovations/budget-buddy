import { z } from "zod";

const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const monthNames = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const dates = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Stable across server/browser time zones. Invalid source dates never leak ISO strings into the UI. */
export function formatMonth(value: string, short = false): string {
  if (!Month.safeParse(value).success) return "Date to confirm";
  const name = monthNames.format(new Date(`${value}-01T00:00:00Z`));
  return short ? name : `${name} ${value.slice(0, 4)}`;
}

export function formatMonthRange(start: string, end: string): string {
  if (!Month.safeParse(start).success || !Month.safeParse(end).success) return "Dates to confirm";
  if (start === end) return formatMonth(start);
  return start.slice(0, 4) === end.slice(0, 4)
    ? `${formatMonth(start, true)}–${formatMonth(end)}`
    : `${formatMonth(start)}–${formatMonth(end)}`;
}

export function formatDate(value: string): string {
  if (Month.safeParse(value).success) return formatMonth(value);
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return "Date to confirm";
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return "Date to confirm";
  return dates.format(date);
}
