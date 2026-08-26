"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewCaseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not create the case.");
      setBusy(false);
      return;
    }
    const c = await res.json();
    router.push(`/case/${c.id}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} required
        placeholder="Client v. Defendant"
        className="flex-1 rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
      <button type="submit" disabled={busy}
        className="rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
        {busy ? "Adding…" : "Add case"}
      </button>
      {error && <p className="text-sm text-oxblood">{error}</p>}
    </form>
  );
}
