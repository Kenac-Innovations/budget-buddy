"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeletePlan() {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/session", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("Delete failed");
      // T2 stores device drafts; clear only Budget Buddy data, never unrelated storage.
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("bb-") && key !== "bb-theme") localStorage.removeItem(key);
        }
      } catch { /* Browser storage can be disabled; server deletion still succeeded. */ }
      setConfirming(false);
      setMessage("Your plan was deleted. You can start a new conversation.");
    } catch {
      setMessage("Your plan could not be deleted. Try again, or use the data contact below.");
    } finally { setBusy(false); }
  }
  return <div className="space-y-3">
    {confirming ? <>
      <p>This deletes the plan and conversation for this device or private return link. This cannot be undone.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="destructive" disabled={busy} onClick={remove}>{busy ? "Deleting your plan…" : "Delete permanently"}</Button>
        <Button variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Keep my plan</Button>
      </div>
    </> : <Button variant="outline" onClick={() => setConfirming(true)}>Delete my plan</Button>}
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </div>;
}
