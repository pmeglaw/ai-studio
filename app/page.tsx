import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { listOpenCases } from "@/lib/queries";
import { NewCaseForm } from "@/components/new-case-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireSession();
  const cases = listOpenCases();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Open cases</h1>
        <p className="mt-1 text-muted">
          Every case carries its liens. Red count = unresolved at the gate.
        </p>
      </section>

      <NewCaseForm />

      {cases.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-muted">
          No cases yet. Add the first one above.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/case/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-ground/60">
                <span className="font-semibold">{c.title}</span>
                <span className="font-mono text-xs text-muted">
                  {c.lien_count} lien{c.lien_count === 1 ? "" : "s"}
                  {c.unresolved_count > 0 && (
                    <span className="ml-3 rounded bg-oxblood px-2 py-0.5 text-white">
                      {c.unresolved_count} unresolved
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
