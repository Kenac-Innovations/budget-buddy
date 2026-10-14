/** Run with pnpm exec tsx docs/codex/reports/T5/review.ts [create|verify]. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildWorkbook } from "../../../../src/lib/export/workbook";
import { exportDemoPlan } from "../../../../src/lib/export/fixtures";
const directory = "/private/tmp/budget-buddy-T5-review";
async function load(path: string) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(new Uint8Array(await readFile(path)) as unknown as ExcelJS.Buffer);
  return wb;
}
async function main() {
  if (process.argv[2] === "verify") {
    const original = await load(`${directory}/recalculated/ICT-plan-2027.xlsx`);
    const edited = await load(`${directory}/recalculated/ICT-plan-edited.xlsx`);
    assert.equal(original.getWorksheet("Summary")!.getCell("B10").result, 49401);
    assert.equal(original.getWorksheet("Summary")!.getCell("B11").result, 1);
    assert.equal(edited.getWorksheet("Summary")!.getCell("B10").result, 68401.23);
    assert.equal(edited.getWorksheet("Summary")!.getCell("B11").result, 0);
    for (const wb of [original, edited]) for (const ws of wb.worksheets) ws.eachRow((row) => row.eachCell((cell) => {
      assert.notEqual(cell.type, ExcelJS.ValueType.Error);
      if (cell.type === ExcelJS.ValueType.Formula) assert.notEqual(typeof cell.result, "object", `${ws.name}!${cell.address} error result`);
    }));
    console.log("LibreOffice recalculation verified: 49,401.00 → 68,401.23; unpriced count 1 → 0; no formula errors.");
    return;
  }
  await mkdir(`${directory}/recalculated`, { recursive: true });
  await writeFile(`${directory}/ICT-plan-2027.xlsx`, await buildWorkbook(exportDemoPlan(), { organisation: "Demo financial services organisation", role: "CIO", generatedAt: new Date("2026-10-14T12:00:00Z") }));
  const edited = await load(`${directory}/ICT-plan-2027.xlsx`);
  edited.calcProperties.fullCalcOnLoad = true;
  const budget = edited.getWorksheet("Budget by objective")!;
  budget.eachRow((row) => {
    if (row.getCell(1).value === "Solar + UPS kit, per branch") row.getCell(3).value = 5;
    if (row.getCell(1).value === "Installation and commissioning") row.getCell(7).value = 1750.025;
  });
  await edited.xlsx.writeFile(`${directory}/ICT-plan-edited.xlsx`);
  console.log(`Synthetic workbooks written to ${directory}`);
}
void main();
