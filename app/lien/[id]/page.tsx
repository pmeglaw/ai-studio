import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/guard";
import { getCase, getLien } from "@/lib/queries";
import { EditLienForm } from "@/components/edit-lien-form";

export const dynamic = "force-dynamic";

export default async function LienPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const lien = getLien(Number(id));
  if (!lien) notFound();
  const caseRow = getCase(lien.case_id)!;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/case/${caseRow.id}`} className="font-mono text-xs text-muted hover:text-ink">
          ← {caseRow.title}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{lien.provider}</h1>
      </div>
      <EditLienForm lien={lien} />
    </div>
  );
}
