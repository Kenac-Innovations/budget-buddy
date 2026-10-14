import Decimal from "decimal.js";
import { useLayoutEffect, useRef, useState } from "react";
import type { Plan } from "@/lib/plan/types";
import { money } from "./money";
import type { Hud } from "./derive";

function AnimatedTotal({ value, currency }: { value: Decimal; currency: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(new Decimal(0));
  const target = value.toString();
  useLayoutEffect(() => {
    const to = new Decimal(target), from = previous.current;
    const start = performance.now();
    let frame = 0;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => { cancelAnimationFrame(frame); previous.current = to; if (element.current) element.current.textContent = money(to, currency); };
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - progress, 3);
      previous.current = from.plus(to.minus(from).times(eased.toString()));
      if (element.current) element.current.textContent = money(previous.current.toDecimalPlaces(2), currency);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    if (media.matches) finish(); else frame = requestAnimationFrame(tick);
    const change = () => { if (media.matches) finish(); };
    media.addEventListener("change", change);
    return () => { cancelAnimationFrame(frame); media.removeEventListener("change", change); };
  }, [target, currency]);
  return <span ref={element} aria-hidden>{money(new Decimal(0), currency)}</span>;
}
function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}
export function BudgetHud({ hud, plan, onCategory }: { hud: Hud; plan: Plan; onCategory: (category: string | null) => void }) {
  const [month, setMonth] = useState<string | null>(null);
  const { totals, categories } = hud;
  const currency = totals.reportingCurrency;
  const maximum = Decimal.max(1, ...totals.reportingMonthly.values());
  const segments = categories.filter(c => c.hasAmount).map((entry, index) => {
    const length = totals.reportingTotal.isZero() ? 0 : entry.total.div(totals.reportingTotal).times(100).toNumber();
    const offset = categories.filter(c => c.hasAmount).slice(0, index).reduce((sum, c) => sum.plus(c.total), new Decimal(0));
    const segment = { ...entry, length, offset: totals.reportingTotal.isZero() ? 0 : offset.div(totals.reportingTotal).times(100).toNumber(), color: `var(--chart-${index % 5 + 1})` };
    return segment;
  });
  const hasAmount = totals.lines.some(l => l.reportingTotal !== null) || (hud.deferred.size > 0 && hud.hasBaselineAmount);
  const payments = month ? totals.lines.filter(l => l.reportingMonthly?.get(month)?.gt(0)) : [];
  return <section className="bb-hud-budget" aria-label="Budget overview">
    <div className="bb-hud-total-row">
      <div><p className="bb-hud-eyebrow">{hud.complete ? "Planned spend" : "Accepted spend"}</p>
        <p className="bb-hud-total" aria-label={hasAmount ? `${money(totals.reportingTotal, currency)}${hud.complete ? " planned spend" : " so far"}` : "Awaiting prices"}>
          {hasAmount ? <><AnimatedTotal value={totals.reportingTotal} currency={currency} />{!hud.complete && <span aria-hidden> so far</span>}</> : <span className="bb-hud-awaiting">Awaiting prices</span>}
        </p>
        <p className="text-caption text-ink-2">{hud.unpriced} unpriced · Accepted lines only{totals.unconvertedLineIds.length > 0 && ` · ${totals.unconvertedLineIds.length} awaiting exchange rates`}</p>
      </div><span className="bb-hud-private">Private draft</span>
    </div>
    {plan.lines.some(l => l.price?.evidence.reference === "Demo price list · not real prices") && <p className="bb-hud-demo-note">Illustrative demo prices · Not commercial offers</p>}
    {hud.deferred.size > 0 && <p className="bb-hud-savings" role="status">Deferring saves {money(hud.savings, currency)}{!hud.baselineComplete && " so far"}</p>}
    <div className="bb-hud-breakdown">
      <div className="bb-hud-ring-wrap">
        <svg className="bb-hud-ring" viewBox="0 0 120 120" role="img" aria-label="Accepted priced spend by category. Category amounts follow in the table.">
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--line-2)" strokeWidth="13" />
          <g transform="rotate(-90 60 60)">{segments.filter(s => s.length > 0).map(s => <circle key={`${s.category}-${s.total}`} className="bb-hud-segment" cx="60" cy="60" r="44" pathLength="100"
            fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={`${s.length} ${100 - s.length}`} strokeDashoffset={-s.offset}
            onMouseEnter={() => onCategory(s.category)} onMouseLeave={() => onCategory(null)}><title>{`${s.category}: ${money(s.total, currency)}`}</title></circle>)}</g>
          <text x="60" y="57" textAnchor="middle" className="bb-hud-ring-number">{hud.priced}/{hud.count}</text>
          <text x="60" y="73" textAnchor="middle" className="bb-hud-ring-caption">lines priced</text>
        </svg>
        <ul className="bb-hud-legend">{segments.map(s => <li key={s.category}><button type="button" onMouseEnter={() => onCategory(s.category)} onMouseLeave={() => onCategory(null)} onFocus={() => onCategory(s.category)} onBlur={() => onCategory(null)}>
          <i style={{ background: s.color }} aria-hidden /><span>{s.category}</span><strong>{s.hasAmount ? money(s.total, currency) : "Pending"}</strong>
        </button></li>)}{!segments.length && <li className="text-caption text-ink-2">Accept priced lines to see the spend mix.</li>}</ul>
      </div>
      <div className="sr-only"><table><caption>Accepted priced spend by category ({currency})</caption><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>{categories.map(c => <tr key={c.category}><th>{c.category}</th><td>{c.hasAmount ? c.total.toFixed(2) : "No priced spend accepted"}</td></tr>)}</tbody></table></div>
      <div className="bb-hud-completeness"><div><strong>{hud.priced} of {hud.count} lines priced</strong><span>{hud.count ? Math.round(hud.priced / hud.count * 100) : 0}%</span></div>
        <div className="bb-hud-track" role="progressbar" aria-label="Lines priced" aria-valuemin={0} aria-valuemax={hud.count || 1} aria-valuenow={hud.priced}><span style={{ transform: `scaleX(${hud.count ? hud.priced / hud.count : 0})` }} /></div>
        <button type="button" className="bb-hud-ceiling" aria-disabled="true">Set a ceiling <span>Coming soon</span></button>
      </div>
    </div>
    <div className="bb-hud-timeline"><div className="bb-hud-chart-heading"><h3>Monthly cash plan</h3><span>{plan.profile.periodStart} – {plan.profile.periodEnd}</span></div>
      <svg viewBox={`0 0 ${Math.max(360, totals.months.length * 30)} 130`} preserveAspectRatio="none" role="img" aria-label="Monthly cash payments. Use the month buttons or the table for payment details.">
        <line x1="0" y1="104" x2={Math.max(360, totals.months.length * 30)} y2="104" stroke="var(--line-2)" />
        {totals.months.map((m, index) => {
          const width = Math.max(360, totals.months.length * 30) / totals.months.length;
          const value = totals.reportingMonthly.get(m)!;
          const height = value.div(maximum).times(82).toNumber();
          return <g key={m} onMouseEnter={() => setMonth(m)} onMouseLeave={() => setMonth(null)}>
            <rect x={index * width + 5} y="10" width={width - 10} height="95" fill="transparent" />
            <rect key={value.toString()} className="bb-hud-bar" x={index * width + 5} y={104 - height} width={width - 10} height={height} rx="3" fill="var(--chart-1)" />
            <title>{`${m}: ${hasAmount ? money(value, currency) : "No priced payments"}`}</title>
          </g>;
        })}
      </svg>
      <div className="bb-hud-month-buttons">{totals.months.map(m => <button key={m} aria-label={`View payments for ${m}`} aria-pressed={month === m} onClick={() => setMonth(month === m ? null : m)} onFocus={() => setMonth(m)}>{monthLabel(m)}</button>)}</div>
      <div className="bb-hud-payments" aria-live="polite">{month ? <><strong>{month} · {hasAmount ? money(totals.reportingMonthly.get(month)!, currency) : "No priced payments"}</strong>{payments.length ? <ul>{payments.map(l => <li key={l.id}>{plan.lines.find(p => p.id === l.id)?.title} <span>{money(l.reportingMonthly!.get(month)!, currency)}</span></li>)}</ul> : <p>No priced payments scheduled.</p>}</> : <p>Explore a month to see its payments.</p>}</div>
      <div className="sr-only"><table><caption>Monthly cash plan ({currency})</caption><thead><tr><th>Month</th><th>Total</th><th>Payments</th></tr></thead><tbody>{totals.months.map(m => <tr key={m}><th>{m}</th><td>{hasAmount ? totals.reportingMonthly.get(m)!.toFixed(2) : "No priced payments"}</td><td>{totals.lines.filter(l => l.reportingMonthly?.get(m)?.gt(0)).map(l => `${plan.lines.find(p => p.id === l.id)?.title}: ${l.reportingMonthly!.get(m)!.toFixed(2)}`).join("; ") || "No priced payments"}</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
