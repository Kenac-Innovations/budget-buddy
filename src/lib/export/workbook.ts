import ExcelJS from "exceljs";
import Decimal from "decimal.js";
import { z } from "zod";
import { Plan } from "@/lib/plan/types";
import { planTotals } from "@/lib/plan/totals";
import { calculateLine } from "@/lib/budget/calculate";
import { EVIDENCE_STATUS } from "@/components/ui/status-pill";

const Meta = z.object({
  organisation: z.string().max(160).optional(),
  role: z.string().max(80).optional(),
  generatedAt: z.date().optional(),
});
export type WorkbookMeta = z.input<typeof Meta>;
export const WORKBOOK_FOOTER = "Prepared with Budget Buddy, an AI advisor run by Kenac Computer Systems. Prices are sourced as shown; unpriced items are excluded from totals.";
const NAVY = "FF123347";
const WHITE = "FFFFFFFF";
const FORMAT = "#,##0.00";
const titleCase = (text: string) => text[0].toUpperCase() + text.slice(1).replaceAll("_", " ");
// Conversion to binary numbers happens only at the Excel serialization boundary.
const numeric = (value: Decimal) => value.toNumber();

/** Finance can edit quantity and unit price; cash, subtotals and summary recalculate. */
export async function buildWorkbook(input: Plan, metadata: WorkbookMeta = {}): Promise<Buffer> {
  const plan = Plan.parse(input);
  const meta = Meta.parse(metadata);
  const totals = planTotals(plan);
  const accepted = plan.lines.filter((line) => line.state === "accepted");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Budget Buddy by Kenac Computer Systems";
  workbook.created = meta.generatedAt ?? new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  function sheet(name: string, subtitle: string, columns: string[], widths: number[]) {
    const ws = workbook.addWorksheet(name, {
      properties: { defaultRowHeight: 25, outlineLevelRow: 2 },
      views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:4" },
      headerFooter: { oddFooter: `&L&6${WORKBOOK_FOOTER}&R&8Page &P of &N` },
    });
    ws.columns = widths.map((width) => ({ width }));
    ws.mergeCells(1, 1, 1, columns.length);
    ws.getCell("A1").value = name;
    ws.getRow(1).height = 38;
    ws.mergeCells(2, 1, 2, columns.length);
    ws.getCell("A2").value = subtitle;
    ws.getRow(2).height = 38;
    ws.getRow(4).values = columns;
    return ws;
  }
  function band(ws: ExcelJS.Worksheet, title: string, level: number) {
    const row = ws.addRow([title]);
    row.outlineLevel = level;
    ws.mergeCells(row.number, 1, row.number, ws.columnCount);
    row.font = { name: "Hanken Grotesk", bold: true, color: { argb: WHITE } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    row.height = 30;
    return row;
  }

  const summary = sheet("Summary", "2027 ICT plan · Business objectives and planned spend", ["Overview", "Detail"], [36, 105]);
  summary.addRows([
    ["Organisation", meta.organisation ?? "Private device plan"],
    ["Role", meta.role ?? plan.profile.role ?? "Not provided"],
    ["Planning period", `${plan.profile.periodStart} to ${plan.profile.periodEnd}`],
    ["Reporting currency", plan.profile.reportingCurrency],
    ["Generated at (UTC)", workbook.created.toISOString()],
    ["Planned spend so far", null],
    ["Lines unpriced", totals.unpricedLineIds.length],
    ["Lines awaiting exchange rates", totals.unconvertedLineIds.length],
  ]);
  summary.getCell("B10").numFmt = FORMAT;
  band(summary, "Business objectives", 0);
  for (const objective of plan.objectives.filter((o) => o.state === "accepted")) {
    summary.addRow([objective.title, objective.measure ?? "Agree a measure of success"]);
  }
  band(summary, "How to read this", 0);
  summary.addRow(["Totals", "Accepted lines only. Unpriced and unconverted items are excluded from reporting totals; the total is incomplete until they are resolved."]);
  summary.addRow(["Adjusting the budget", "Edit quantity and unit price on Budget by objective. Monthly cash, objective subtotals and planned spend recalculate. Timing and frequency changes require a fresh export."]);
  summary.addRow(["Assumptions", "Cash basis; each payment rounded to two decimals. Source prices retain their precision, displayed to two decimals. Bundle prices apply once per payment, irrespective of quantity. Tax is unresolved; no additional tax or exchange rates have been assumed."]);
  summary.addRow(["Privacy", "This workbook contains your accepted plan and open questions. Keep it private unless you choose to share it."]);
  summary.addRow(["Prepared with", WORKBOOK_FOOTER]);

  const budget = sheet("Budget by objective", `Accepted lines · Period totals in the line's currency · Reporting currency: ${totals.reportingCurrency}`, ["Item", "Category", "Qty", "Unit", "Frequency", "Timing", "Unit price", "Currency", "Evidence", "Supplier", "Period total", "Price basis"], [44, 24, 12, 16, 18, 16, 18, 12, 23, 24, 20, 16]);
  const cash = sheet("Monthly cash profile", "Engine cash schedule · Amounts in each line's original currency · Totals kept separate by currency", ["Item", "Currency", ...totals.months, "Period total"], [44, 12, ...totals.months.map(() => 16), 20]);
  const evidence = sheet("Evidence register", "Prices as captured · Check validity with the supplier before committing funds", ["Item", "Evidence", "Reference", "Captured at", "Valid until", "Validity at export", "Supplier", "Unit price", "Currency"], [40, 24, 60, 25, 25, 24, 25, 18, 12]);
  const questions = sheet("Open questions", "Resolve these before approving the budget · Proposed items carry no commitment", ["Type", "Item", "Question or caution"], [26, 44, 105]);
  const cashRows = new Map<string, number>();
  const summaryRefs: string[] = [];
  const currencies = [...new Set(accepted.map((l) => l.price?.currency ?? totals.reportingCurrency))];

  // Group by the actual relationship, retaining accepted lines even if a parent is undecided.
  const groups = new Map<string | null, typeof accepted>();
  for (const objective of plan.objectives.filter((o) => o.state === "accepted")) groups.set(objective.id, []);
  for (const line of accepted) {
    const initiative = plan.initiatives.find((i) => i.id === line.initiativeId);
    const key = initiative?.objectiveId ?? null;
    groups.set(key, [...(groups.get(key) ?? []), line]);
  }
  for (const [objectiveId, lines] of groups) {
    const objective = plan.objectives.find((o) => o.id === objectiveId);
    band(budget, objective?.state === "accepted" ? objective.title : objective ? "Objective awaiting agreement" : "Carried-forward items", 0);
    const initiativeIds = [...new Set([...plan.initiatives.filter((i) => i.objectiveId === objectiveId && i.state === "accepted").map((i) => i.id), ...lines.map((l) => l.initiativeId)])];
    const objectiveRows: { row: number; currency: string }[] = [];
    for (const initiativeId of initiativeIds) {
      const initiative = plan.initiatives.find((i) => i.id === initiativeId);
      band(budget, initiative?.state === "accepted" ? `${initiative.title} · ${titleCase(initiative.disposition)}` : initiative ? "Initiative awaiting agreement" : "Renewals and ongoing commitments", 1);
      if (!lines.some((l) => l.initiativeId === initiativeId)) budget.addRow(["No accepted budget lines yet"]);
      for (const line of lines.filter((l) => l.initiativeId === initiativeId)) {
        const result = totals.lines.find((r) => r.id === line.id)!;
        const price = line.price;
        const row = budget.addRow([line.title, line.category, line.quantity ?? "Unknown", line.unit ?? "Not specified", titleCase(line.frequency), line.paymentMonth ?? plan.profile.periodStart, price ? numeric(new Decimal(price.unitPrice)) : "Unpriced", result.currency, EVIDENCE_STATUS[price?.evidence.type ?? "UNPRICED"].label, price?.evidence.supplier?.isOperator ? `Kenac · ${price.evidence.supplier.name}` : price?.evidence.supplier?.name ?? "Not specified", null, line.priceBasis === "bundle" ? "Bundle" : "Per unit"]);
        row.outlineLevel = 2;
        if (price) row.getCell(7).note = `Source unit price: ${price.unitPrice} ${price.currency}. Displayed to two decimals; cash is rounded per payment.`;
        if (line.note) row.getCell(1).note = line.note;
        objectiveRows.push({ row: row.number, currency: result.currency });
        if (result.currency === totals.reportingCurrency) summaryRefs.push(`'Budget by objective'!K${row.number}`);
        const cells: ExcelJS.CellValue[] = [line.title, result.currency];
        const schedule = calculateLine({ id: line.id, currency: result.currency, frequency: line.frequency, priceBasis: line.priceBasis, quantity: 1, unitPrice: "1", paymentMonth: line.paymentMonth }, { start: plan.profile.periodStart, end: plan.profile.periodEnd }, result.currency, []);
        for (const month of totals.months) {
          const b = row.number;
          const qty = line.priceBasis === "bundle" ? "1" : `'Budget by objective'!C${b}`;
          const priced = `AND(ISNUMBER('Budget by objective'!G${b}),ISNUMBER(${qty}))`;
          cells.push({ formula: `IF(${priced},${schedule.monthly.has(month) ? `ROUND('Budget by objective'!G${b}*${qty},2)` : "0"},"Unpriced")`, result: result.status === "unpriced" ? "Unpriced" : numeric(result.monthly.get(month) ?? new Decimal(0)) });
        }
        const cr = cash.addRow(cells);
        cashRows.set(line.id, cr.number);
        const last = cash.getColumn(2 + totals.months.length).letter;
        const totalCol = cash.getColumn(3 + totals.months.length).letter;
        cr.getCell(totalCol).value = { formula: `IF(COUNT(C${cr.number}:${last}${cr.number})=COLUMNS(C${cr.number}:${last}${cr.number}),SUM(C${cr.number}:${last}${cr.number}),"Unpriced")`, result: result.total ? numeric(result.total) : "Unpriced" };
        row.getCell(11).value = { formula: `'Monthly cash profile'!${totalCol}${cr.number}`, result: result.total ? numeric(result.total) : "Unpriced" };
      }
    }
    for (const currency of [...new Set(objectiveRows.map((r) => r.currency))]) {
      const refs = objectiveRows.filter((r) => r.currency === currency).map((r) => `K${r.row}`);
      const total = lines.filter((l) => (l.price?.currency ?? totals.reportingCurrency) === currency).reduce((sum, l) => sum.plus(totals.lines.find((r) => r.id === l.id)?.total ?? 0), new Decimal(0));
      const subtotal = budget.addRow(["Objective subtotal so far", null, null, null, null, null, null, currency, null, null, { formula: `SUM(${refs.join(",")})`, result: numeric(total) }]);
      subtotal.font = { name: "Hanken Grotesk", bold: true };
    }
  }
  summary.getCell("B10").value = { formula: `SUM(${summaryRefs.join(",") || "0"})`, result: numeric(totals.reportingTotal) };
  const cashTotalColumn = cash.getColumn(3 + totals.months.length).letter;
  summary.getCell("B11").value = { formula: accepted.length ? accepted.map((l) => `COUNTIF('Monthly cash profile'!${cashTotalColumn}${cashRows.get(l.id)},"Unpriced")`).join("+") : "0", result: totals.unpricedLineIds.length };
  for (const currency of currencies) {
    const refs = accepted.filter((l) => (l.price?.currency ?? totals.reportingCurrency) === currency).map((l) => cashRows.get(l.id)!);
    const row = cash.addRow(["Total so far", currency]);
    for (let col = 3; col <= 3 + totals.months.length; col++) {
      const letter = cash.getColumn(col).letter;
      const amount = accepted.filter((l) => (l.price?.currency ?? totals.reportingCurrency) === currency).reduce((sum, l) => {
        const r = totals.lines.find((r) => r.id === l.id)!;
        return sum.plus(col === 3 + totals.months.length ? r.total ?? 0 : r.monthly.get(totals.months[col - 3]) ?? 0);
      }, new Decimal(0));
      row.getCell(col).value = { formula: `SUM(${refs.map((r) => `${letter}${r}`).join(",")})`, result: numeric(amount) };
    }
    row.font = { name: "Hanken Grotesk", bold: true };
  }
  for (const line of accepted) {
    if (line.price) {
      const e = line.price.evidence;
      const expiry = e.validUntil ? Date.parse(e.validUntil) : NaN;
      evidence.addRow([line.title, EVIDENCE_STATUS[e.type].label, e.reference, e.capturedAt, e.validUntil ?? "Not supplied", e.validUntil ? !Number.isFinite(expiry) ? "Check date" : expiry < workbook.created.getTime() ? "Expired — refresh price" : "Within stated validity" : "Confirm with supplier", e.supplier?.isOperator ? `Kenac · ${e.supplier.name}` : e.supplier?.name ?? "Not specified", numeric(new Decimal(line.price.unitPrice)), line.price.currency]);
    }
    if (totals.unpricedLineIds.includes(line.id)) questions.addRow(["Unpriced", line.title, line.price ? "Confirm the quantity to calculate this line." : "Request a quote, attach a sourced price or enter your own labelled estimate."]);
    if (totals.unconvertedLineIds.includes(line.id)) questions.addRow(["Exchange rate needed", line.title, `Price is in ${line.price!.currency}. No exchange rate to ${totals.reportingCurrency} has been assumed.`]);
  }
  for (const initiative of plan.initiatives.filter((i) => i.state === "accepted")) {
    if (initiative.disposition === "investigate") questions.addRow(["Investigate", initiative.title, initiative.rationale]);
    if (initiative.caution) questions.addRow(["Caution", initiative.title, initiative.caution]);
  }
  for (const item of [...plan.objectives, ...plan.initiatives, ...plan.lines].filter((i) => i.state === "proposed")) {
    questions.addRow(["Not yet decided", item.title, "Review this proposal. It is excluded from totals until accepted."]);
  }
  if (questions.rowCount === 4) questions.addRow(["No open questions", "", "All accepted lines have a price and reporting currency."]);
  for (const ws of workbook.worksheets) {
    if (ws !== summary) {
      ws.addRow([]);
      const footer = ws.addRow([WORKBOOK_FOOTER]);
      ws.mergeCells(footer.number, 1, footer.number, ws.columnCount);
      footer.height = 40;
      footer.font = { name: "Hanken Grotesk", size: 9, italic: true };
    }
    ws.eachRow((row, number) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "Hanken Grotesk", size: 11, ...cell.font };
        cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
        if (cell.type === ExcelJS.ValueType.Number || cell.type === ExcelJS.ValueType.Formula) cell.numFmt = FORMAT;
      });
      if (number > 4 && row.height === undefined) row.height = ws === summary ? number < 15 ? 32 : 62 : ws === questions ? 62 : 46;
    });
    for (const n of [1, 4]) {
      ws.getRow(n).font = { name: "Hanken Grotesk", size: n === 1 ? 20 : 11, bold: true, color: { argb: WHITE } };
      ws.getRow(n).fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    }
    ws.pageSetup.printArea = `A1:${ws.getColumn(ws.columnCount).letter}${ws.rowCount}`;
  }
  summary.getCell("B11").numFmt = "0";
  summary.getCell("B12").numFmt = "0";
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
