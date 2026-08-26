import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { formatCents } from "@/lib/money";
import { getCase, liensForCase, unresolvedLiens } from "@/lib/queries";
import { AddLienForm } from "@/components/add-lien-form";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const caseRow = getCase(Number(id));
  if (!caseRow) notFound();

  const liens = liensForCase(caseRow.id);
  const openCount = unresolvedLiens(caseRow.id).length;
  const totalCents = liens.reduce((sum, l) => sum + l.amount_cents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-muted hover:text-ink">← All cases</Link>
          <h1 className="text-2xl font-bold tracking-tight">{caseRow.title}</h1>
        </div>
        <Link href={`/case/${caseRow.id}/gate`}
          className={`rounded px-4 py-2 text-sm font-medium ${
            openCount > 0
              ? "bg-oxblood text-white hover:opacity-90"
              : "border border-line bg-surface hover:bg-ground"
          }`}>
          Settlement gate{openCount > 0 ? ` · ${openCount} open` : " · clear"}
        </Link>
      </div>

      <AddLienForm caseId={caseRow.id} />

      {liens.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-muted">
          No liens on this case yet. Add each provider above as notices come in.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-widest text-muted">
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {liens.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">{l.provider}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCents(l.amount_cents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="max-w-64 truncate px-4 py-3 text-muted">{l.notes}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/lien/${l.id}`} className="text-navy underline-offset-2 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-mono text-xs text-muted">
                <td className="px-4 py-3">Total asserted</td>
                <td className="px-4 py-3 text-right">{formatCents(totalCents)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
