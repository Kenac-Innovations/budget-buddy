"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const SaveResult = z.object({ saved: z.literal(true), emailed: z.boolean(), returnUrl: z.string().url() });
const ApiError = z.object({ error: z.string() });
export type SaveFormResult = z.infer<typeof SaveResult>;
export type SaveFormProps = { onSaved?: (result: SaveFormResult) => void };
const fieldClass = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Mount only inside T2's wrap-up card, after the advisor offers to save. */
export function SaveForm({ onSaved }: SaveFormProps) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SaveFormResult | null>(null);
  const [email, setEmail] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/session/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"), email: data.get("email"), organisation: data.get("organisation"),
          role: data.get("role"), consentEmail: data.has("consentEmail"), consentContact: data.has("consentContact"),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const failure = ApiError.safeParse(body);
        setError(failure.success ? failure.data.error : "We couldn't save your plan. Try again.");
        return;
      }
      const saved = SaveResult.parse(body);
      setEmail(String(data.get("email") ?? ""));
      setResult(saved);
      onSaved?.(saved);
    } catch {
      setError("We couldn't confirm your save. Try again in a moment.");
    } finally { setBusy(false); }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.returnUrl);
      setCopyNotice("Link copied.");
    } catch { setCopyNotice("Select the link above and copy it to keep it."); }
  }

  if (result) return (
    <div className="min-w-0 space-y-3" aria-live="polite">
      <p className="font-medium">{result.emailed ? `Saved. I've sent it to ${email}.` : "Saved. Keep this link to come back:"}</p>
      <a className="block break-all text-primary underline underline-offset-4" href={result.returnUrl}>{result.returnUrl}</a>
      <p className="text-sm text-muted-foreground">Keep this link private. Anyone with it can open your plan.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={copyLink}>Copy return link</Button>
        <a className="text-sm font-medium text-primary underline underline-offset-4" href="/api/export/xlsx" download>Download Excel file</a>
      </div>
      {copyNotice && <p className="text-sm" role="status">{copyNotice}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="min-w-0 space-y-4" aria-describedby={`${id}-privacy`} aria-busy={busy}>
      <p id={`${id}-privacy`} className="text-sm text-muted-foreground">Save your private plan and a link to come back. Kenac only sees the lines you choose to share.</p>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Your details</legend>
        <label className="min-w-0 space-y-1.5 text-label" htmlFor={`${id}-name`}>
          <span className="block">Name</span>
          <input className={fieldClass} id={`${id}-name`} name="name" autoComplete="name" maxLength={120} required />
        </label>
        <label className="min-w-0 space-y-1.5 text-label" htmlFor={`${id}-email`}>
          <span className="block">Work email</span>
          <input className={fieldClass} id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
        <label className="min-w-0 space-y-1.5 text-label" htmlFor={`${id}-organisation`}>
          <span className="block">Organisation</span>
          <input className={fieldClass} id={`${id}-organisation`} name="organisation" autoComplete="organization" maxLength={160} required />
        </label>
        <label className="min-w-0 space-y-1.5 text-label" htmlFor={`${id}-role`}>
          <span className="block">Role</span>
          <select className={fieldClass} id={`${id}-role`} name="role" defaultValue="" required>
            <option value="" disabled>Choose your role</option>
            <option value="CIO">CIO</option><option value="CTO">CTO</option><option value="CSO">CSO</option>
            <option value="ICT_MANAGER">ICT manager</option><option value="OTHER">Other</option>
          </select>
        </label>
      </fieldset>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="sr-only">Your choices</legend>
        <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" name="consentEmail" defaultChecked required /><span>Email me my plan and the Excel file</span></label>
        <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" name="consentContact" /><span>Kenac may contact me about items I choose to share</span></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="w-full sm:w-auto" type="submit" disabled={busy}>{busy ? "Save in progress…" : "Save my plan"}</Button>
    </form>
  );
}

export default SaveForm;
