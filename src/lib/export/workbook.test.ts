import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { emptyPlan, type Plan } from "@/lib/plan/types";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { buildWorkbook, WORKBOOK_FOOTER } from "./workbook";
import { exportDemoPlan } from "./fixtures";

async function load(plan = exportDemoPlan()) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(await buildWorkbook(plan, { organisation: "Demo organisation", role: "CIO", generatedAt: new Date("2026-10-14T12:00:00Z") })) as unknown as ExcelJS.Buffer);
  return workbook;
}
function change(plan: Plan, op: PlanOp) {
  const r = applyOp(plan, op, "user");
  if (!r.ok) throw new Error(r.error);
  return r.plan;
}
describe("Finance workbook", () => {
  it("matches the five-sheet demo golden, including formulas, blanks and Unpriced", async () => {
    const wb = await load();
    expect(Object.fromEntries(wb.worksheets.map((ws) => [ws.name, ws.getSheetValues()]))).toMatchSnapshot();
    expect(wb.getWorksheet("Summary")!.getCell("B10").result).toBe(49401);
    for (const sheet of wb.worksheets) {
      expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 4 });
      expect(sheet.pageSetup).toMatchObject({ orientation: "landscape", fitToWidth: 1 });
      expect(sheet.headerFooter.oddFooter).toContain(WORKBOOK_FOOTER);
      expect(sheet.getCell("A1").fill).toMatchObject({ fgColor: { argb: "FF123347" } });
    }
  });
  it("excludes proposed and dismissed lines from all totals and lists proposals as undecided", async () => {
    let plan = exportDemoPlan();
    plan = change(plan, { op: "set_state", id: "l5", state: "proposed" });
    plan = change(plan, { op: "set_state", id: "l7", state: "dismissed" });
    const wb = await load(plan);
    const budget = JSON.stringify(wb.getWorksheet("Budget by objective")!.getSheetValues());
    expect(budget).not.toContain("Solar + UPS kit");
    expect(budget).not.toContain("Firewall subscription");
    expect(wb.getWorksheet("Summary")!.getCell("B10").result).toBe(0);
    expect(JSON.stringify(wb.getWorksheet("Open questions")!.getSheetValues())).toContain("Not yet decided");
    expect(JSON.stringify(wb.getWorksheet("Evidence register")!.getSheetValues())).not.toContain("DEMO-Q");
  });
  it("keeps unconverted money separate and unknown quantities unpriced", async () => {
    let plan = exportDemoPlan();
    plan = change(plan, { op: "price_line", id: "l5", price: { unitPrice: "7.555", currency: "ZAR", evidence: { type: "USER_ESTIMATE", reference: "Demo", capturedAt: "2026-10-14" } } });
    plan = change(plan, { op: "update_line", id: "l7", quantity: null }); // bundle stays priced
    const wb = await load(plan);
    expect(wb.getWorksheet("Summary")!.getCell("B10").result).toBe(1400.5);
    expect(wb.getWorksheet("Summary")!.getCell("B12").value).toBe(1);
    expect(JSON.stringify(wb.getWorksheet("Budget by objective")!.getSheetValues())).toContain("30.22");
    expect(JSON.stringify(wb.getWorksheet("Open questions")!.getSheetValues())).toContain("Exchange rate needed");
    plan = change(plan, { op: "update_line", id: "l5", quantity: null });
    const unknown = await load(plan);
    expect(unknown.getWorksheet("Summary")!.getCell("B11").result).toBe(2);
    expect(JSON.stringify(unknown.getWorksheet("Open questions")!.getSheetValues())).toContain("Confirm the quantity");
  });
  it("handles empty plans, literal formula-looking titles, and invalid boundaries", async () => {
    const plan = change(emptyPlan(), { op: "add_line", initiativeId: null, title: "=HYPERLINK(\"https://invalid.test\")", category: "Hardware", quantity: 1, frequency: "monthly" });
    const wb = await load(plan);
    const values = wb.getWorksheet("Budget by objective")!.getSheetValues();
    expect(JSON.stringify(values)).toContain("HYPERLINK");
    expect(wb.getWorksheet("Budget by objective")!.getCell("A7").type).toBe(ExcelJS.ValueType.String);
    expect((await load(emptyPlan())).getWorksheet("Summary")!.getCell("B10").result).toBe(0);
    await expect(buildWorkbook({} as Plan)).rejects.toThrow();
    await expect(buildWorkbook(emptyPlan(), { generatedAt: "bad" as unknown as Date })).rejects.toThrow();
  });
});
