import Decimal from "decimal.js";
import { CircleAlert, Download, FileCheck2, FileSpreadsheet, Plus, Target, Wallet } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";
import { BUDGET_STATUS, EVIDENCE_STATUS, StatusPill } from "@/components/ui/status-pill";
import { calculateBudget } from "@/lib/budget/calculate";
import { sampleBudget, sampleLines } from "@/lib/budget/sample";

const usd = (d: Decimal) =>
  `US$${d.toNumber().toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const money = (d: Decimal, currency: string) =>
  `${currency === "USD" ? "US$" : `${currency} `}${d.toNumber().toLocaleString("en-US", {
    minimumFractionDigits: d.isInteger() ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
const monthName = (m: string) =>
  new Date(`${m}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });

export default function BudgetPage() {
  const result = calculateBudget({
    period: sampleBudget.period,
    reportingCurrency: sampleBudget.reportingCurrency,
    lines: sampleLines,
    rates: sampleBudget.rates,
  });
  const byId = new Map(result.lines.map((l) => [l.id, l]));
  const ceiling = new Decimal(sampleBudget.ceilingUsd);
  const ceilingPct = result.reportingTotal.div(ceiling).times(100).toNumber();
  const evidenced = sampleLines.filter((l) => ["CONTRACT", "QUOTE", "OPERATOR_PRICE_LIST", "PUBLISHED_PRICE", "HISTORICAL_ACTUAL"].includes(l.evidence));
  const evidencedTotal = evidenced.reduce((s, l) => s.plus(byId.get(l.id)?.reportingTotal ?? 0), new Decimal(0));
  const evidencedPct = result.reportingTotal.isZero() ? 0 : evidencedTotal.div(result.reportingTotal).times(100).toNumber();
  const maxMonth = Decimal.max(...result.reportingMonthly.values());

  return (
    <AppShell
      topbar={
        <>
          <p className="truncate font-semibold text-ink">{sampleBudget.name}</p>
          <span className="text-meta hidden text-ink-2 sm:inline">Jan–Dec 2027 · Reporting in USD</span>
          <span className="text-meta ml-auto hidden text-ink-3 md:inline">Sample data · not saved</span>
        </>
      }
    >
      <PageHeader
        title="Budget"
        icon={FileSpreadsheet}
        meta={
          <span className="flex items-center gap-2">
            {sampleBudget.organisation} <StatusPill map={BUDGET_STATUS} status={sampleBudget.status} size="sm" />
          </span>
        }
        actions={
          <>
            <Button variant="outline">
              <Download /> Export Excel
            </Button>
            <Button>
              <Plus /> Add line
            </Button>
          </>
        }
      />

      {!result.complete && (
        <div className="mb-[18px] flex items-start gap-2.5 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
          <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.7} />
          <p>
            The total is incomplete. {result.unpricedLineIds.length} line{result.unpricedLineIds.length === 1 ? " has" : "s have"} no
            sourced price yet. Request a quote or match it to the Kenac price list to complete the budget.
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          tone="primary"
          value={usd(result.reportingTotal)}
          label={result.complete ? "Planned spend" : "Planned spend so far"}
          sub={`${result.lines.length} lines`}
        />
        <StatCard
          icon={Target}
          tone={ceilingPct > 100 ? "destructive" : "default"}
          value={`${Math.round(ceilingPct)}%`}
          label="Of the budget ceiling"
          sub={`Ceiling ${usd(ceiling)}`}
        />
        <StatCard
          icon={FileCheck2}
          tone={evidencedPct >= 80 ? "success" : "warning"}
          value={`${Math.round(evidencedPct)}%`}
          label="Backed by documents"
          sub="Quotes, contracts, price lists"
        />
        <StatCard
          icon={CircleAlert}
          tone={result.unpricedLineIds.length ? "destructive" : "success"}
          value={String(result.unpricedLineIds.length)}
          label="Unpriced lines"
          sub="Not counted in the total"
        />
      </section>

      <div className="mt-[18px] grid grid-cols-1 gap-[18px] xl:grid-cols-[1fr_340px]">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold tracking-[0.025em] text-muted-foreground uppercase">
                  <th className="h-10 px-4">Item</th>
                  <th className="h-10 px-2">Evidence</th>
                  <th className="h-10 px-2">Timing</th>
                  <th className="h-10 px-2 text-right">Unit price</th>
                  <th className="h-10 px-4 text-right">Period total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {sampleLines.map((line) => {
                  const r = byId.get(line.id)!;
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-ink">{line.title}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {line.category}
                          {line.supplier?.isOperator && <Badge variant="secondary">Kenac</Badge>}
                        </p>
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusPill map={EVIDENCE_STATUS} status={line.evidence} size="sm" />
                      </td>
                      <td className="px-2 py-2.5 text-ink-2">{line.timing}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap text-ink-2">
                        {line.unitPrice === null ? "—" : money(new Decimal(line.unitPrice), line.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink">
                        {r.reportingTotal ? usd(r.reportingTotal) : <span className="font-normal text-ink-3">Not counted</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-col gap-[18px]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Monthly cash profile</CardTitle>
                <CardDescription>Payments by month, in USD.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Monthly payments in USD">
                {[...result.reportingMonthly].map(([m, v]) => (
                  <div key={m} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-[4px] bg-chart-1"
                      style={{ height: `${maxMonth.isZero() ? 0 : v.div(maxMonth).times(112).toNumber()}px` }}
                      title={`${monthName(m)}: ${usd(v)}`}
                    />
                    <span className="text-[10.5px] text-ink-3">{monthName(m).slice(0, 1)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Budget ceiling</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ProgressBar value={ceilingPct} tone={ceilingPct > 100 ? "red" : ceilingPct > 90 ? "amber" : "green"} label="Share of ceiling used" />
              <p className="text-body-sm text-ink-2">
                {usd(result.reportingTotal)} of {usd(ceiling)}. Unpriced lines will add to this.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
