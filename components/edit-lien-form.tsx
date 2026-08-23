"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIEN_STATUSES, type Lien } from "@/lib/types";

export function EditLienForm({ lien }: { lien: Lien }) {
  const router = useRouter();
  const [provider, setProvider] = useState(lien.provider);
  const [amount, setAmount] = useState((lien.amount_cents / 100).toFixed(2));
  const [status, setStatus] = useState<string>(lien.status);
  const [notes, setNotes] = useState(lien.notes);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/liens/${lien.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, amount, status, notes }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not save changes.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const field =
    "rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20";
  const label = "font-mono text-xs uppercase tracking-widest text-muted";

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className={label}>Provider</span>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} required className={field} />
      </label>
      <div className="flex gap-3">
        <label className="flex w-40 flex-col gap-1">
          <span className={label}>Amount</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} required
            inputMode="decimal" className={`${field} font-mono`} />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className={label}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            {LIEN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={label}>Negotiation notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
          placeholder="Dates, names, offers, agreed reductions…" className={field} />
      </label>
      {error && <p className="text-sm text-oxblood">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy}
          className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="font-mono text-xs text-resolved">Saved</span>}
      </div>
    </form>
  );
}
