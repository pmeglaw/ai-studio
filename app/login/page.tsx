"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setError("Sign-in failed. Check the email and password.");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-md border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-line bg-white px-3 py-2 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20" />
        </label>
        {error && <p className="text-sm text-oxblood">{error}</p>}
        <button type="submit" disabled={busy}
          className="mt-1 rounded bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-deep disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
