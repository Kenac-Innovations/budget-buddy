"use client";
import Decimal from "decimal.js";
import { memo,useMemo,useState } from "react";
import { Check,ExternalLink,Minus,Plus,Sparkles,Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVIDENCE_STATUS,StatusPill } from "@/components/ui/status-pill";
import { PlanOp } from "@/lib/plan/ops";
import type { ItemState,Plan,PlanLine } from "@/lib/plan/types";
import { catalogueDisplay } from "@/lib/pricing/catalogue-display";
import { cn } from "@/lib/utils";
import styles from "./styles";
import { formatDate, formatMonth } from "./dates";
import { deriveHud,pathIds,sharePercent } from "./plan/derive";
import { BudgetHud } from "./plan/budget-hud";
import { LineVisual } from "./plan/visual";
import { money } from "./plan/money";
import { useResponseCheck } from "./plan/use-response-check";
import { DetailSheet } from "./plan/detail-sheet";
import { Connector } from "./plan/connector";
const DISPOSITION={
  fund: { label: "Fund",tone: "green" },pilot: { label: "Pilot",tone: "slate" },
  investigate: { label: "Investigate",tone: "amber" },defer: { label: "Defer",tone: "grey" },
} as const;
export { money } from "./plan/money";
export function planSummary(plan: Plan) {
  const hud=deriveHud(plan);
  const totals=hud.totals;
  const unpriced=new Set([...hud.view.lines.filter(l => l.state!=="dismissed"&&!l.price).map(l => l.id),...totals.unpricedLineIds]).size;
  const complete=totals.complete&&!unpriced&&totals.lines.length>0;
  const hasAmount=totals.lines.some(l => l.reportingTotal!==null);
  const amount=hasAmount? `${money(totals.reportingTotal,totals.reportingCurrency)}${complete? "":" so far"}`:"Awaiting prices";
  return { totals,complete,hasAmount,amount,unpriced };
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
    {state!=="proposed"&&<p className="mb-2 flex items-center gap-1.5 text-caption text-ink-2">{state==="accepted"&&<Check key={state} className="bb-hud-check" size={13} />} {state==="accepted"? "Accepted":"Set aside"}{reason? ` · ${reason}`:""}</p>}
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
export function EstimateForm({ line,currency,disabled,onOp }: {
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
export const PlanView=memo(function PlanView({ plan,changed,disabled,onOp: persistOp }: {
  plan: Plan;
  changed: Record<string,number>;
  disabled: boolean;
  onOp: (op: PlanOp) => Promise<boolean>;
}) {
  const onOp=useResponseCheck(plan.version,persistOp);
  const hud=useMemo(() => deriveHud(plan),[plan]);
  const [focused,setFocused]=useState<string|null>(null);
  const [category,setCategory]=useState<string|null>(null);
  const [detail,setDetail]=useState<string|null>(null);
  const path=useMemo(() => focused? pathIds(plan,focused):null,[plan,focused]);
  const selected=plan.lines.find(l => l.id===detail);
  const dismissed=[...plan.objectives,...plan.initiatives,...plan.lines].filter(i => i.state==="dismissed");
  const activeInitiatives=plan.initiatives.filter(i => i.state!=="dismissed");
  const empty=!plan.objectives.length&&!plan.lines.length;
  const nodeProps=(id: string,state: ItemState,spotted=false) => ({
    "data-plan-id": id,tabIndex: 0,
    className: cn("bb-hud-node",state==="proposed"&&"bb-hud-proposed",spotted&&"bb-hud-spotted",path&&!path.has(id)&&"bb-hud-dim",path?.has(id)&&"bb-hud-path"),
    onMouseOver: (e: React.MouseEvent) => { e.stopPropagation(); setFocused(id); },
    onMouseLeave: () => setFocused(null),
    onFocus: (e: React.FocusEvent) => { e.stopPropagation(); setFocused(id); },
    onBlur: (e: React.FocusEvent) => { if(!e.currentTarget.contains(e.relatedTarget)) setFocused(null); },
  });
  const highlight=(id: string) => changed[id]? <span key={changed[id]} className="bb-hud-glow" aria-hidden />:null;
  const pending=(state: ItemState) => state==="proposed"? <span className="bb-hud-decision">Awaiting your decision</span>:null;
  const lineCard=(line: PlanLine) => {
    const supply=catalogueDisplay(line);
    const total=hud.lineTotals.get(line.id);
    const deferred=Boolean(line.initiativeId&&hud.deferred.has(line.initiativeId));
    return <article key={line.id} {...nodeProps(line.id,line.state,line.forgottenCost)} className={cn(nodeProps(line.id,line.state,line.forgottenCost).className,"bb-hud-line",category&&category!==line.category&&"bb-hud-dim",category===line.category&&"bb-hud-category-active")}
      onKeyDown={e => { if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")) { e.preventDefault(); setDetail(line.id); } }}
      onClick={e => { if(!(e.target as HTMLElement).closest("button,a,input,textarea,select,label,form")) setDetail(line.id); }}>
      {highlight(line.id)}
      <div className="bb-hud-line-top"><LineVisual key={line.price?.product?.imageUrl} line={line} /><div className="min-w-0 flex-1">
        <div className="bb-hud-pills"><StatusPill map={EVIDENCE_STATUS} status={line.price?.evidence.type??"UNPRICED"} size="sm" />
          {(supply||line.price?.evidence.type==="OPERATOR_PRICE_LIST")&&<Badge variant="secondary">Kenac</Badge>}
          {line.forgottenCost&&<span className="bb-hud-marker"><Sparkles size={12} aria-hidden />Forgotten cost</span>}
        </div>
        <button className="bb-hud-line-title" onClick={() => setDetail(line.id)} aria-label={`View details for ${line.title}`}>{line.title}</button>
        {line.price?.evidence.type==="OPERATOR_PRICE_LIST"&&line.price.product&&<p className="text-caption text-ink-2">{line.price.product.name}</p>}
        {supply&&<p className="text-caption text-ink-2">{supply.name}<br />{supply.label}</p>}
        <p className="mt-1 text-caption text-ink-2">{line.quantity??"Confirm quantity"} {line.unit??"units"} × {line.price? money(new Decimal(line.price.unitPrice),line.price.currency):"Unpriced"}{line.priceBasis==="bundle"&&" · Bundle price"}</p>
        <span className="bb-hud-timing">{line.frequency.replaceAll("_"," ")} · {formatMonth(line.paymentMonth??plan.profile.periodStart)}</span>
      </div></div>
      <div className="bb-hud-line-value"><strong>{deferred? "Deferred":!line.price? "Unpriced":total?.total? money(total.total,line.price.currency):"Confirm quantity"}</strong>{pending(line.state)}</div>
      {line.price&&<p className="text-caption text-ink-2">{line.price.evidence.reference}{total?.reportingTotal===null&&total.total!==null&&" · Awaiting exchange rate"}</p>}
      <div className="bb-hud-quantity"><span>Quantity</span><Button variant="outline" size="sm" aria-label={`Decrease quantity for ${line.title}`} disabled={disabled||line.quantity===null||line.quantity<=1} onClick={() => onOp({ op: "update_line",id: line.id,quantity: Math.max(1,(line.quantity??1)-1) })}><Minus size={14} /></Button><output>{line.quantity??"?"}</output><Button variant="outline" size="sm" aria-label={`Increase quantity for ${line.title}`} disabled={disabled} onClick={() => onOp({ op: "update_line",id: line.id,quantity: (line.quantity??0)+1 })}><Plus size={14} /></Button></div>
      <EstimateForm line={line} currency={plan.profile.reportingCurrency} disabled={disabled} onOp={onOp} />
      <ItemActions id={line.id} state={line.state} disabled={disabled} onOp={onOp} />
    </article>;
  };
  const initiativeNode=(i: Plan["initiatives"][number]) => <div className="bb-hud-branch" key={i.id} data-path={Boolean(path?.has(i.id))}><Connector active={Boolean(path?.has(i.id))} />
    <article {...nodeProps(i.id,i.state,i.proactive)}>{highlight(i.id)}
      <div className="bb-hud-pills"><StatusPill map={DISPOSITION} status={i.disposition} size="sm" />{i.proactive&&<Spotted />}{pending(i.state)}</div>
      <h4 className="mt-3 text-card-title">{i.title}</h4><p className="mt-2 text-body-sm text-ink-2">{i.rationale}</p>
      {i.caution&&<p className="mt-2 text-caption text-ink-2">Watch out: {i.caution}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{i.sources.map((source,n) => <span key={n} className="text-caption text-ink-2">{source.url? <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand underline underline-offset-4">{source.title}<ExternalLink size={11} /></a>:source.title} · {formatDate(source.date)}</span>)}</div>
      {i.state==="accepted"&&<Button className="mt-3" variant="outline" size="sm" disabled={disabled} aria-pressed={i.disposition==="defer"} onClick={() => onOp({ op: "update_initiative",id: i.id,disposition: i.disposition==="defer"? "fund":"defer" })}>{i.disposition==="defer"? "Fund initiative":"Defer initiative"}</Button>}
      <ItemActions id={i.id} state={i.state} reason={i.dismissReason} disabled={disabled} onOp={onOp} />
    </article>
    {plan.lines.filter(l => l.initiativeId===i.id&&l.state!=="dismissed").map(l => <div className="bb-hud-branch" key={l.id} data-path={Boolean(path?.has(l.id))}><Connector active={Boolean(path?.has(l.id))} />{lineCard(l)}</div>)}
  </div>;
  return <div className={styles.planContent}>
    <div className="bb-hud-header"><div><p className="bb-hud-eyebrow">{plan.profile.periodStart.slice(0,4)} ICT plan</p><h2 className="mt-1 text-page-title">Your living plan</h2></div><Target size={25} className="text-brand" strokeWidth={1.4} aria-hidden /></div>
    <BudgetHud hud={hud} plan={plan} onCategory={setCategory} />
    {plan.profile.role&&<p className="my-5 text-caption text-ink-2">{plan.profile.role} lens · {plan.profile.staffBand} staff · {plan.profile.siteBand} sites{plan.profile.sector&&` · ${plan.profile.sector}`}</p>}
    <section className="bb-hud-tree" aria-labelledby="board-story-heading"><h3 id="board-story-heading" className={styles.sectionHeading}>Your board story <span className="ml-auto">Objectives → Initiatives → Budget</span></h3>
      {empty&&<p className="text-body-sm text-ink-2">Your plan builds here as we talk. Agree the objectives first; the budget follows.</p>}
      {plan.objectives.filter(o => o.state!=="dismissed").map(o => <div key={o.id} className="bb-hud-objective-group"><article {...nodeProps(o.id,o.state)}>{highlight(o.id)}<div className="bb-hud-pills"><span className="bb-hud-eyebrow">Objective</span>{pending(o.state)}</div><h4 className="mt-3 text-card-title">{o.title}</h4>{o.measure&&<p className="mt-2 text-body-sm text-ink-2">{o.measure}</p>}<p className="bb-hud-objective-spend">{hud.objectives.get(o.id)!.isZero()? "No priced spend accepted":money(hud.objectives.get(o.id)!,hud.totals.reportingCurrency)} <span>· {sharePercent(hud.objectives.get(o.id)!,hud.totals.reportingTotal)}% of accepted spend</span></p><ItemActions id={o.id} state={o.state} disabled={disabled} onOp={onOp} /></article>{activeInitiatives.filter(i => i.objectiveId===o.id).map(initiativeNode)}</div>)}
      {activeInitiatives.filter(i => plan.objectives.find(o => o.id===i.objectiveId)?.state==="dismissed").length>0&&<div className="bb-hud-objective-group"><h4 className="mb-3 text-card-title">Initiatives with an objective set aside</h4>{activeInitiatives.filter(i => plan.objectives.find(o => o.id===i.objectiveId)?.state==="dismissed").map(initiativeNode)}</div>}
      {plan.lines.filter(l => l.state!=="dismissed"&&(!l.initiativeId||plan.initiatives.find(i => i.id===l.initiativeId)?.state==="dismissed")).length>0&&<div className="bb-hud-objective-group"><h4 className="mb-3 text-card-title">Recurring essentials and other lines</h4><div className="space-y-3">{plan.lines.filter(l => l.state!=="dismissed"&&(!l.initiativeId||plan.initiatives.find(i => i.id===l.initiativeId)?.state==="dismissed")).map(lineCard)}</div></div>}
    </section>
    {dismissed.length>0&&<details className="bb-hud-dismissed"><summary>Set aside ({dismissed.length})</summary><ul>{dismissed.map(item => <li key={item.id}><span>{item.title}</span><Button variant="outline" size="sm" disabled={disabled} onClick={() => onOp({ op: "set_state",id: item.id,state: "proposed" })}>Restore item</Button></li>)}</ul></details>}
    {selected&&<DetailSheet line={selected} plan={plan} actions={<ItemActions id={selected.id} state={selected.state} disabled={disabled} onOp={onOp} />} onClose={() => setDetail(null)} />}
  </div>;
});
