"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SHARING_STATUS, StatusPill } from "@/components/ui/status-pill";
import { applyOp, type PlanOp } from "@/lib/plan/ops";
import { Plan } from "@/lib/plan/types";
import type { ContactDetails } from "@/lib/session/store";
import { SharedRow, sharedRows } from "@/lib/export/sharing";

const OpResponse = z.object({ plan: Plan });
const ShareResponse = z.object({ rows: z.array(SharedRow) });
const ApiError = z.object({ error: z.string() });
const OwnerContext = z.object({ plan: Plan, saved: z.literal(true), contact: z.object({ name: z.string(), email: z.string().email(), organisation: z.string(), role: z.string(), consentEmail: z.boolean(), consentContact: z.boolean() }) });
type Choices = Record<string, { shared: boolean; allocation: boolean }>;
export type SharePanelProps = {
  plan: Plan;
  contact: ContactDetails | null;
  saved: boolean;
  onPlanChange?: (plan: Plan) => void;
};

/** Mount after saving or on a user's request. T8 wires this into the advisor's wrap-up. */
export function SharePanel({ plan, contact, saved, onPlanChange }: SharePanelProps) {
  const id = useId();
  const [choices, setChoices] = useState<Choices>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmedRows, setConfirmedRows] = useState<SharedRow[] | null>(null);
  const lines = plan.lines.filter((l) => l.state === "accepted");
  const choice = (line: typeof lines[number]) => choices[line.id] ?? { shared: line.sharedWithKenac, allocation: line.shareAllocation };
  const preview = useMemo(() => {
    let draft = plan;
    for (const line of plan.lines.filter((l) => l.state === "accepted")) {
      const selected = choices[line.id];
      if (!selected) continue;
      const result = applyOp(draft, { op: "set_sharing", id: line.id, shared: selected.shared, shareAllocation: selected.allocation }, "user");
      if (result.ok) draft = result.plan;
    }
    return sharedRows(draft, contact);
  }, [plan, contact, choices]);

  function update(lineId: string, selected: { shared: boolean; allocation: boolean }) {
    setChoices((old) => ({ ...old, [lineId]: selected }));
    setConfirmedRows(null);
    setNotice("");
  }
  async function confirm() {
    if (busy || !saved || !contact) return;
    setBusy(true); setError(""); setNotice("");
    try {
      // Re-read before applying: avoid silently overriding another tab's changes.
      const fresh = await fetch("/api/plan", { cache: "no-store" });
      const freshBody: unknown = await fresh.json();
      if (!fresh.ok) throw new Error("Open your private plan again, then retry sharing.");
      let current = OpResponse.parse(freshBody).plan;
      if (current.version !== plan.version) {
        onPlanChange?.(current);
        throw new Error("Your plan changed. Review the updated items before sharing.");
      }
      for (const line of lines) {
        const selected = choice(line);
        if (line.sharedWithKenac === selected.shared && line.shareAllocation === selected.allocation) continue;
        const op: PlanOp = { op: "set_sharing", id: line.id, shared: selected.shared, shareAllocation: selected.allocation };
        const response = await fetch("/api/plan/op", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op }) });
        const body: unknown = await response.json();
        if (!response.ok) {
          const failure = ApiError.safeParse(body);
          throw new Error(failure.success ? failure.data.error : "We couldn't update sharing. Reopen it to check your choices.");
        }
        current = OpResponse.parse(body).plan;
        onPlanChange?.(current);
      }
      const response = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error("Some choices may have saved. Reopen sharing to check them and confirm again.");
      const confirmed = ShareResponse.parse(body);
      setConfirmedRows(confirmed.rows);
      setChoices({});
      setNotice(confirmed.rows.length ? `Shared ${confirmed.rows.length} ${confirmed.rows.length === 1 ? "item" : "items"} with Kenac. You can withdraw them here at any time.` : "All items are private. Kenac can no longer view them here.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We couldn't confirm sharing. Reopen it to check your choices.");
    } finally { setBusy(false); }
  }

  if (!saved || !contact) return <p className="text-sm text-muted-foreground">Save your plan before choosing what to share with Kenac.</p>;
  const rows = confirmedRows ?? preview;
  return <section className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 text-card-foreground sm:p-6" aria-labelledby={`${id}-title`} aria-busy={busy}>
    <div className="space-y-2"><h3 id={`${id}-title`} className="text-card-title">Choose what to share with Kenac</h3><p className="text-sm text-muted-foreground">Your plan stays private. Choose individual items for Kenac to review. Budgets are hidden unless you include them.</p></div>
    {!contact.consentContact && <p className="text-sm text-muted-foreground">Your organisation and contact details will stay hidden. You have not agreed to contact from Kenac.</p>}
    <fieldset disabled={busy} className="space-y-3"><legend className="sr-only">Items to share</legend>
      {lines.length ? lines.map((line) => {
        const selected = choice(line);
        return <div key={line.id} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 break-words font-medium">{line.title}</p><StatusPill map={SHARING_STATUS} status={line.sharedWithKenac ? "IDENTIFIED" : "PRIVATE"} size="sm" /></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={selected.shared} onChange={(e) => update(line.id, { shared: e.target.checked, allocation: false })} /><span>Share with Kenac<span className="sr-only">: {line.title}</span></span></label>
          {selected.shared && <label className="ml-6 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={selected.allocation} onChange={(e) => update(line.id, { shared: true, allocation: e.target.checked })} /><span>Include my budget for this item</span></label>}
        </div>;
      }) : <p className="text-sm text-muted-foreground">Accept a budget line before choosing what to share.</p>}
    </fieldset>
    <div className="space-y-3" aria-live="polite"><h4 className="font-semibold">Preview what Kenac receives</h4><p className="text-sm text-muted-foreground">Only the fields below are shared. The sharing date is recorded when you confirm.</p>
      {rows.length ? rows.map((row) => <article key={row.lineId} className="min-w-0 rounded-lg border border-border bg-muted/30 p-4"><h5 className="break-words font-medium">{row.item}</h5><dl className="mt-3 grid min-w-0 gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Quantity and unit</dt><dd>{row.quantity ?? "Not specified"} {row.unit ?? ""}</dd></div>
        <div><dt className="text-muted-foreground">Timing</dt><dd>{row.timing} · {row.frequency.replaceAll("_", " ")}</dd></div>
        <div><dt className="text-muted-foreground">Category</dt><dd>{row.category}</dd></div>
        <div><dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap break-words">{row.notes ?? "Not specified"}</dd></div>
        {row.organisation && <div><dt className="text-muted-foreground">Organisation</dt><dd className="break-words">{row.organisation}</dd></div>}
        {row.contact && <div><dt className="text-muted-foreground">Contact</dt><dd className="break-words">{row.contact.name} · {row.contact.email} · {row.contact.role}</dd></div>}
        {row.allocation && <div><dt className="text-muted-foreground">Budget for the planning period</dt><dd>{row.allocation.amount === null ? "Unpriced" : `${row.allocation.currency} ${row.allocation.amount}`}</dd></div>}
        {row.sharedAt && <div><dt className="text-muted-foreground">Shared date</dt><dd>{row.sharedAt}</dd></div>}
      </dl></article>) : <p className="text-sm text-muted-foreground">No items selected. Confirm to keep all items private.</p>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <Button type="button" className="w-full sm:w-auto" disabled={busy || !lines.length} onClick={confirm}>{busy ? "Save sharing choices…" : rows.length ? `Share ${rows.length} ${rows.length === 1 ? "item" : "items"} with Kenac` : "Keep all items private"}</Button>
  </section>;
}

export default SharePanel;

/** Self-loading entry point so the parent need not retain contact details in UI state. */
export function SavedSharePanel({ onPlanChange }: { onPlanChange?: (plan: Plan) => void }) {
  const [context, setContext] = useState<z.infer<typeof OwnerContext> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/share", { cache: "no-store", signal: controller.signal });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(ApiError.safeParse(body).data?.error ?? "We couldn't load sharing. Reopen it to try again.");
        setContext(OwnerContext.parse(body));
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "We couldn't load sharing.");
      }
    })();
    return () => controller.abort();
  }, []);
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (!context) return <p role="status" className="text-sm text-muted-foreground">Load your sharing choices…</p>;
  return <SharePanel {...context} onPlanChange={(next) => { setContext((old) => old ? { ...old, plan: next } : old); onPlanChange?.(next); }} />;
}
