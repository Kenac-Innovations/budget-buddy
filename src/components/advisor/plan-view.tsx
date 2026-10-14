"use client";
import Decimal from "decimal.js";
import { useEffect,useRef,useState } from "react";
import { ArrowDown,Check,ExternalLink,Sparkles,Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVIDENCE_STATUS,StatusPill } from "@/components/ui/status-pill";
import { applyOp,PlanOp } from "@/lib/plan/ops";
import { planTotals } from "@/lib/plan/totals";
import type { ItemState,Plan,PlanLine } from "@/lib/plan/types";
import { cn } from "@/lib/utils";
import styles from "./styles";
const DISPOSITION={
  fund: { label: "Fund",tone: "green" },pilot: { label: "Pilot",tone: "slate" },
  investigate: { label: "Investigate",tone: "amber" },defer: { label: "Defer",tone: "grey" },
} as const;
export function money(amount: Decimal,currency: string) {
  const [whole,fraction]=amount.toFixed(amount.isInteger()? 0:2).split(".");
  return `${currency==="USD"? "US$":`${currency} `}${whole.replace(/\B(?=(\d{3})+(?!\d))/g,",")}${fraction? `.${fraction}`:""}`;
}
export function planSummary(plan: Plan) {
  const totals=planTotals(plan);
  const unpriced=new Set([...plan.lines.filter(l => l.state!=="dismissed"&&!l.price).map(l => l.id),...totals.unpricedLineIds]).size;
  const complete=totals.complete&&!unpriced&&totals.lines.length>0;
  const hasAmount=totals.lines.some(l => l.reportingTotal!==null);
  const amount=hasAmount? `${money(totals.reportingTotal,totals.reportingCurrency)}${complete? "":" so far"}`:"Awaiting prices";
  return { totals,complete,hasAmount,amount,unpriced };
}
function AnimatedMoney({ value,currency }: {
  value: Decimal;
  currency: string;
}) {
  const [display,setDisplay]=useState(value);
  const previous=useRef(value);
  const target=value.toString();
  useEffect(() => {
    const to=new Decimal(target);
    const from=previous.current;
    previous.current=to;
    let frame: number;
    const start=performance.now();
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick=(now: number) => {
      const progress=reduced? 1:Math.min(1,(now-start)/450);
      const current = from.plus(to.minus(from).times(new Decimal(progress.toString()))).toDecimalPlaces(2);
      previous.current = current;
      setDisplay(current);
      if(progress<1)
        frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  },[target]);
  return <span aria-hidden="true">{money(display,currency)}</span>;
}
export function Spotted() {
  return <span className="inline-flex items-center gap-1 text-caption font-semibold text-brand"><Sparkles size={14} aria-hidden />Spotted</span>;
}
export function ItemActions({ id,state,reason,disabled,onOp }: {
  id: string;
  state: ItemState;
  reason?: string;
  disabled: boolean;
  onOp: (op: PlanOp) => Promise<boolean>;
}) {
  const [showReason,setShowReason]=useState(false);
  const [text,setText]=useState("");
  return (<div className="mt-3">
    {state!=="proposed"&&<p className="mb-2 flex items-center gap-1.5 text-caption text-ink-2">{state==="accepted"&&<Check size={13} />} {state==="accepted"? "Accepted":"Set aside"}{reason? ` · ${reason}`:""}</p>}
    <div className="flex flex-wrap gap-1">
      {state!=="accepted"&&<Button variant="outline" size="sm" disabled={disabled} onClick={() => onOp({ op: "set_state",id,state: "accepted" })}>Accept</Button>}
      {state!=="dismissed"&&<Button variant="ghost" size="sm" disabled={disabled} aria-expanded={showReason} onClick={() => setShowReason(!showReason)}>Not now</Button>}
      {state!=="proposed"&&<Button variant="ghost" size="sm" disabled={disabled} onClick={() => onOp({ op: "set_state",id,state: "proposed" })}>Reconsider</Button>}
    </div>
    {showReason&&<form className="mt-3 rounded-lg bg-surface-2 p-3" onSubmit={async (e) => {
      e.preventDefault(); if(await onOp({ op: "set_state",id,state: "dismissed",reason: text.trim()||undefined }))
        setShowReason(false);
    }}>
      <label htmlFor={`reason-${id}`} className="text-caption font-semibold">Add a reason <span className="font-normal text-ink-2">(optional)</span></label>
      <textarea autoFocus id={`reason-${id}`} maxLength={300} value={text} onChange={e => setText(e.target.value)} className={cn(styles.input,"mt-2 min-h-16 w-full")} placeholder="What should the advisor remember?" />
      <div className="mt-2 flex gap-1">
        <Button variant="outline" size="sm" disabled={disabled} type="submit">Set aside</Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => setShowReason(false)}>Cancel</Button>
      </div>
    </form>}
  </div>);
}
function EstimateForm({ line,currency,disabled,onOp }: {
  line: PlanLine;
  currency: string;
  disabled: boolean;
  onOp: (op: PlanOp) => Promise<boolean>;
}) {
  const [open,setOpen]=useState(false);
  const [price,setPrice]=useState(line.price?.evidence.type==="USER_ESTIMATE"? line.price.unitPrice:"");
  const [selected,setSelected]=useState(line.price?.currency??currency);
  const [error,setError]=useState("");
  return <div className="mt-2">
    <Button variant="link" size="sm" className="h-auto p-0 text-caption" disabled={disabled} onClick={() => setOpen(!open)} aria-expanded={open}>{line.price?.evidence.type==="USER_ESTIMATE"? "Edit my own estimate":"Add my own estimate"}</Button>
    {open&&<form className="mt-3 rounded-lg border border-line bg-surface-2 p-3" onSubmit={async (e) => {
      e.preventDefault();
      const parsed=PlanOp.safeParse({ op: "price_line",id: line.id,price: { unitPrice: price.trim(),currency: selected,evidence: { type: "USER_ESTIMATE",reference: "Own estimate",capturedAt: new Date().toISOString() } } });
      if(!parsed.success) {
        setError("Enter a non-negative decimal with up to six decimal places.");
        return;
      }
      if(await onOp(parsed.data)) {
        setOpen(false);
        setError("");
      }
    }}>
      <p className="mb-2 text-caption text-ink-2">Your estimate is labelled as yours. Accept the line to include it in the total.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
        <label className="text-caption font-semibold" htmlFor={`price-${line.id}`}>
          {line.priceBasis==="bundle"? "Bundle price":"Unit price"}
          <input autoFocus required id={`price-${line.id}`} inputMode="decimal" maxLength={24} value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className={cn(styles.input,"mt-1 w-full")} aria-invalid={Boolean(error)} aria-describedby={error? `price-error-${line.id}`:undefined} />
        </label>
        <label className="text-caption font-semibold" htmlFor={`currency-${line.id}`}>Currency<select id={`currency-${line.id}`} className={cn(styles.input,"mt-1 w-full")} value={selected} onChange={e => setSelected(e.target.value)}>{Array.from(new Set([currency,"USD","ZWG","ZAR","EUR","GBP"])).map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      {error&&<p id={`price-error-${line.id}`} role="alert" className="mt-2 text-caption text-destructive">{error}</p>}
      <div className="mt-3 flex gap-1">
        <Button type="submit" variant="outline" size="sm" disabled={disabled}>Use estimate</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>}
  </div>;
}
function SourceDate({ date }: {
  date: string;
}) {
  return new Date(`${date.slice(0,7)}-01T00:00:00Z`).toLocaleDateString("en-GB",{ month: "short",year: "numeric",timeZone: "UTC" });
}
export function PlanView({ plan,changed,disabled,onOp }: {
  plan: Plan;
  changed: Record<string,number>;
  disabled: boolean;
  onOp: (op: PlanOp) => Promise<boolean>;
}) {
  const summary=planSummary(plan);
  // Preview proposed line costs through the same reducer and decimal engine, without changing the user's plan.
  const preview=plan.lines.filter(l => l.state==="proposed").reduce((current,line) => {
    const result=applyOp(current,{ op: "set_state",id: line.id,state: "accepted" },"user");
    return result.ok? result.plan:current;
  },plan);
  const lineTotals=new Map(planTotals(preview).lines.map(l => [l.id,l]));
  const empty=!plan.objectives.length&&!plan.lines.length;
  const itemClass=(id: string,state: ItemState) => cn(styles.planItem,"rounded-xl border border-line bg-surface p-4",state==="dismissed"&&"opacity-60");
  const highlight=(id: string) => changed[id]? <span key={changed[id]} className={styles.highlight} aria-hidden />:null;
  return <div className={styles.planContent}>
    <div className="mb-7 flex items-center justify-between gap-3">
      <div>
        <p className="text-caption text-ink-2">Jan–Dec 2027 · Private draft</p>
        <h2 className="mt-1 text-page-title">Your living plan</h2>
      </div>
      <Target size={24} className="text-brand" strokeWidth={1.4} aria-hidden />
    </div>
    <div className="mb-7 rounded-xl border border-brand-border bg-brand-soft p-5">
      <p className="text-caption font-semibold text-ink-2">{summary.complete? "Planned spend":"Planned spend so far"}</p>
      <p className="mt-1 text-[28px] font-semibold tracking-tight text-brand" aria-label={summary.amount}>
        {summary.hasAmount? <><AnimatedMoney value={summary.totals.reportingTotal} currency={summary.totals.reportingCurrency} />{!summary.complete&&<span className="ml-2 text-sm font-medium" aria-hidden> so far</span>}</>:<span className="text-xl">Awaiting prices</span>}
      </p>
      <p className="mt-2 text-caption text-ink-2">{summary.unpriced} unpriced · Total uses accepted lines{summary.totals.unconvertedLineIds.length>0&&` · ${summary.totals.unconvertedLineIds.length} awaiting exchange rates`}</p>
    </div>
    {empty&&<p className="mb-7 text-sm text-ink-2">Your plan builds here as we talk.</p>}
    {plan.profile.role&&<p className="mb-6 text-caption text-ink-2">{plan.profile.role} lens · {plan.profile.staffBand} staff · {plan.profile.siteBand} sites{plan.profile.sector&&` · ${plan.profile.sector}`}</p>}
    <section aria-labelledby="objectives-heading">
      <h3 id="objectives-heading" className={styles.sectionHeading}><span>01</span>Objectives <span className="ml-auto">{plan.objectives.length||""}</span></h3>
      <div className="space-y-3">{plan.objectives.map(o => <article key={o.id} data-plan-id={o.id} className={itemClass(o.id,o.state)}>
        {highlight(o.id)}
        <h4 className="text-card-title">{o.title}</h4>
        {o.measure&&<p className="mt-2 text-body-sm text-ink-2">{o.measure}</p>}
        <ItemActions id={o.id} state={o.state} disabled={disabled} onOp={onOp} />
      </article>)}{!plan.objectives.length&&<Skeleton />}</div>
    </section>
    <ArrowDown size={14} className="my-5 text-ink-3" aria-hidden />
    <section aria-labelledby="initiatives-heading">
      <h3 id="initiatives-heading" className={styles.sectionHeading}><span>02</span>Initiatives <span className="ml-auto">{plan.initiatives.length||""}</span></h3>
      {!plan.initiatives.length&&(empty? <Skeleton />:<p className="text-body-sm text-ink-2">Recommendations will connect to your objectives here.</p>)}
      {plan.objectives.filter(o => plan.initiatives.some(i => i.objectiveId===o.id)).map(o => <div key={o.id} className="mb-5">
        <p className="mb-3 text-caption font-semibold text-ink-2">For {o.title.toLowerCase()}</p>
        <div className="space-y-3">{plan.initiatives.filter(i => i.objectiveId===o.id).map(i => <article key={i.id} data-plan-id={i.id} className={itemClass(i.id,i.state)}>
          {highlight(i.id)}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusPill map={DISPOSITION} status={i.disposition} size="sm" />
            {i.proactive&&<Spotted />}
          </div>
          <h4 className="text-card-title">{i.title}</h4>
          <p className="mt-2 text-body-sm text-ink-2">{i.rationale}</p>
          {i.caution&&<p className="mt-2 text-caption text-ink-2">Watch out: {i.caution}</p>}
          <div className="mt-3 flex flex-wrap gap-2">{i.sources.map((source,n) => <span key={n} className="text-caption text-ink-2">{source.url? <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand underline underline-offset-4">
            {source.title}
            <ExternalLink size={11} />
          </a>:source.title} · <SourceDate date={source.date} /></span>)}</div>
          <ItemActions id={i.id} state={i.state} reason={i.dismissReason} disabled={disabled} onOp={onOp} />
        </article>)}</div>
      </div>)}
    </section>
    <ArrowDown size={14} className="my-5 text-ink-3" aria-hidden />
    <section aria-labelledby="budget-heading">
      <h3 id="budget-heading" className={styles.sectionHeading}><span>03</span>Budget <span className="ml-auto">{plan.lines.length||""}</span></h3>
      <div className="space-y-3">{plan.lines.map(line => {
        const total=lineTotals.get(line.id);
        const initiative=plan.initiatives.find(i => i.id===line.initiativeId);
        return <article key={line.id} data-plan-id={line.id} className={itemClass(line.id,line.state)}>
          {highlight(line.id)}
          <p className="mb-2 text-caption text-ink-2">{initiative?.title??"Recurring essentials"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill map={EVIDENCE_STATUS} status={line.price?.evidence.type??"UNPRICED"} size="sm" />
            {line.price?.evidence.supplier?.isOperator&&<Badge variant="secondary">Kenac</Badge>}
            {line.forgottenCost&&<Spotted />}
          </div>
          <h4 className="mt-3 text-card-title">{line.title}</h4>
          <p className="mt-1 text-caption text-ink-2">{line.quantity??"Quantity to confirm"} {line.unit??(line.priceBasis==="bundle"? "bundle":"units")} · {line.frequency.replace("_"," ")}{line.paymentMonth&&<> · <SourceDate date={line.paymentMonth} /></>}</p>
          <p className="mt-3 font-semibold">{line.state==="dismissed"? "Set aside":!line.price? "Unpriced":total?.total? money(total.total,line.price.currency):"Confirm quantity"}</p>
          {line.price&&<p className="mt-1 text-caption text-ink-2">{money(new Decimal(line.price.unitPrice),line.price.currency)} {line.priceBasis==="bundle"? "per bundle":"per unit"} · {line.price.evidence.reference}{total?.reportingTotal===null&&total.total!==null&&" · Awaiting exchange rate"}</p>}
          {line.note&&<p className="mt-2 text-caption text-ink-2">{line.note}</p>}
          <ItemActions id={line.id} state={line.state} disabled={disabled} onOp={onOp} />
          {line.state!=="dismissed"&&<EstimateForm line={line} currency={plan.profile.reportingCurrency} disabled={disabled} onOp={onOp} />}
        </article>;
      })}{!plan.lines.length&&(empty? <Skeleton />:<p className="text-body-sm text-ink-2">Agreed initiatives become cost lines here. Every price needs a source.</p>)}</div>
    </section>
  </div>;
}
function Skeleton() {
  return <div aria-hidden className="rounded-xl border border-dashed border-line p-5 opacity-50">
    <div className="h-2 w-2/3 rounded-full bg-line" />
    <div className="mt-3 h-2 w-1/2 rounded-full bg-line-2" />
    <div className="mt-5 h-5 w-20 rounded-md bg-surface-2" />
  </div>;
}
