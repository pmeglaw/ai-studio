"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddLienForm({ caseId }: { caseId: number }) {
  const router = useRouter();
  const [provider, setProvider] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/liens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, provider, amount }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not add the lien.");
      setBusy(false);
      return;
    }
    setProvider("");
    setAmount("");
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-1 min-w-48 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Provider</span>
        <input value={provider} onChange={(e) => setProvider(e.target.value)} required
          placeholder="Valley MRI Center"
          className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      </label>
      <label className="flex w-40 flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-muted">Amount</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} required
          placeholder="$4,200.00" inputMode="decimal"
          className="rounded border border-line bg-white px-3 py-2 font-mono outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      </label>
      <button type="submit" disabled={busy}
        className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
        {busy ? "Adding…" : "Add lien"}
      </button>
      {error && <p className="w-full text-sm text-oxblood">{error}</p>}
    </form>
  );
}
