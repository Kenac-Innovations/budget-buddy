import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan, PlanLine } from "@/lib/plan/types";
import { quoteRequest } from "./derive";
import { LineVisual } from "./visual";

export function DetailSheet({ line, plan, actions, onClose }: {
  line: PlanLine; plan: Plan; actions: ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copy, setCopy] = useState("");
  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => { element.close(); trigger?.focus(); };
  }, []);
  const evidence = line.price?.evidence;
  const parts = [line, ...plan.lines.filter(part => part.id !== line.id && line.initiativeId !== null && part.initiativeId === line.initiativeId && part.state !== "dismissed")];
  return createPortal(<dialog ref={dialog} className="bb-hud-detail" aria-labelledby="line-detail-title"
    onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
    onKeyDown={e => {
      // Native showModal makes the rest of the page inert; explicit wrapping also covers nested mobile sheets.
      e.stopPropagation();
      if (e.key !== "Tab") return;
      const nodes = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')).filter(n => n.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
    <header><p className="text-caption text-ink-2">Budget line · Private</p><Button variant="ghost" size="icon" aria-label="Close line details" onClick={onClose}><X /></Button></header>
    <LineVisual key={line.price?.product?.imageUrl} line={line} large />
    <h2 id="line-detail-title" className="mt-6 text-page-title">{line.title}</h2>
    <p className="mt-2 text-body-sm text-ink-2">{line.note ?? "Specifications to confirm before requesting a quote."}</p>
    <section className="bb-hud-parts" aria-labelledby="purchase-parts-title">
      <h3 id="purchase-parts-title">Purchase scope</h3>
      <p>{line.initiativeId ? "Item and related costs recorded under this initiative." : "Recorded purchase item."}</p>
      <ol>{parts.map((part, index) => <li key={part.id} className={part.forgottenCost ? "bb-hud-part-spotted" : undefined}>
        <span className="bb-hud-part-index" aria-hidden>{String(index + 1).padStart(2, "0")}</span>
        <LineVisual line={part} />
        <div><span className="bb-hud-part-kind">{index === 0 ? "Selected item" : "Related cost"}</span><strong>{part.title}</strong><span>{part.quantity ?? "Confirm quantity"} {part.unit ?? "units"} · {part.paymentMonth ?? plan.profile.periodStart}</span>
          {part.forgottenCost && <span className="bb-hud-marker"><Sparkles size={12} aria-hidden />Spotted · Forgotten cost</span>}
          {!part.price && <span>Unpriced</span>}
        </div>
      </li>)}</ol>
      {parts.length === 1 && <p>Other costs are not recorded yet. Confirm accessories, implementation, training and disposal where needed.</p>}
    </section>
    <dl className="bb-hud-specs">
      <dt>Quantity / unit</dt><dd>{line.quantity ?? "To confirm"} {line.unit ?? "units"}{line.priceBasis === "bundle" && " · Bundle price"}</dd>
      <dt>Frequency</dt><dd>{line.frequency.replaceAll("_", " ")}</dd>
      <dt>First payment</dt><dd>{line.paymentMonth ?? plan.profile.periodStart}</dd>
      <dt>Planning months</dt><dd>{plan.profile.periodStart} – {plan.profile.periodEnd}</dd>
      <dt>Evidence type</dt><dd>{evidence?.type.replaceAll("_", " ").toLowerCase() ?? "Unpriced"}</dd>
      <dt>Reference</dt><dd>{evidence?.reference ?? "Request a dated quote"}</dd>
      <dt>Captured</dt><dd>{evidence?.capturedAt.slice(0, 10) ?? "Not yet sourced"}</dd>
      <dt>Valid until</dt><dd>{evidence?.validUntil?.slice(0, 10) ?? "Not specified"}</dd>
    </dl>
    {evidence?.type === "OPERATOR_PRICE_LIST" && <p className="bb-hud-fit">Kenac price-list item attached for this line. {line.note ?? "Confirm specification, quantity and delivery scope before purchase."}</p>}
    <Button variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(quoteRequest(line, plan.profile.periodStart)); setCopy("Copied"); }
      catch { setCopy("Copy unavailable. Select the request below."); }
    }}>Request a quote</Button>
    <p className="mt-2 text-caption" role="status">{copy}</p>
    {copy.startsWith("Copy unavailable") && <textarea aria-label="Quote request" readOnly value={quoteRequest(line, plan.profile.periodStart)} className="bb-advisor-input mt-2 w-full" rows={6} onFocus={e => e.target.select()} />}
    {actions}
  </dialog>, document.body);
}
