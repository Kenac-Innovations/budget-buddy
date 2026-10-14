import { describe, expect, it } from "vitest";
import { formatDate, formatMonth, formatMonthRange } from "./dates";

describe("human planning dates", () => {
  it("formats months and compact ranges without losing the year", () => {
    expect(formatMonth("2027-03")).toBe("Mar 2027");
    expect(formatMonth("2027-03", true)).toBe("Mar");
    expect(formatMonthRange("2027-01", "2027-12")).toBe("Jan–Dec 2027");
    expect(formatMonthRange("2027-03", "2027-03")).toBe("Mar 2027");
    expect(formatMonthRange("2026-11", "2027-02")).toBe("Nov 2026–Feb 2027");
  });
  it("keeps the recorded calendar day for evidence dates and timestamps", () => {
    expect(formatDate("2026-10")).toBe("Oct 2026");
    expect(formatDate("2026-10-14")).toBe("14 Oct 2026");
    expect(formatDate("2026-10-14T23:59:00-07:00")).toBe("14 Oct 2026");
    expect(formatDate("2028-02-29")).toBe("29 Feb 2028");
  });
  it("does not roll invalid dates into a different month or render raw ISO values", () => {
    for (const value of ["", "2027-13", "2027-00", "2027-02-29", "2027-04-31", "unknown"])
      expect(formatDate(value)).toBe("Date to confirm");
    expect(formatMonth("2027-03-01")).toBe("Date to confirm");
    expect(formatMonthRange("2027-13", "2027-12")).toBe("Dates to confirm");
  });
});
