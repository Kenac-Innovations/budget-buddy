import { CheckCheck } from "lucide-react";
import type { ReactNode } from "react";
/** T3 supplies the save form here; contact details belong only at wrap-up. */
export function WrapUpCard({ summary,children }: {
  summary: string;
  children?: ReactNode;
}) {
  return (<section className="mt-5 rounded-xl border border-brand-border bg-brand-soft p-5" aria-label="Plan summary">
    <h3 className="mb-2 flex items-center gap-2 text-card-title text-brand"><CheckCheck size={18} />Ready to take forward</h3>
    <p className="text-sm leading-relaxed text-ink-2">{summary}</p>
    <div className="mt-4 border-t border-brand-border pt-4">{children??<p className="text-caption text-ink-2">Your draft stays private on this device. Saving and email will be available here soon.</p>}</div>
  </section>);
}
