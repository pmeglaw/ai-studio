import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { formatCents } from "@/lib/money";
import { getCase, liensForCase, unresolvedLiens } from "@/lib/queries";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function GatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const caseRow = getCase(Number(id));
  if (!caseRow) notFound();

  const open = unresolvedLiens(caseRow.id);
  const total = liensForCase(caseRow.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/case/${caseRow.id}`} className="font-mono text-xs text-muted hover:text-ink">
          ← {caseRow.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Settlement gate</h1>
        <p className="mt-1 text-muted">
          Every lien below is still asserted or in negotiation. Clear each one —
          verify it, finish the negotiation, or waive it — before disbursement.
        </p>
      </div>

      {open.length === 0 ? (
        <div className="rounded-md border border-resolved/40 bg-resolved/5 p-6">
          <p className="font-semibold text-resolved">Gate is clear.</p>
          <p className="mt-1 text-sm text-muted">
            All {total.length} lien{total.length === 1 ? "" : "s"} on this case
            are verified, reduced, paid, or waived. Nothing is blocking disbursement.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-oxblood/40 bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {open.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.provider}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCents(l.amount_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/lien/${l.id}`} className="text-navy underline-offset-2 hover:underline">
                      Resolve
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
