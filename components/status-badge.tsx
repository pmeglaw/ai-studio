import { UNRESOLVED_STATUSES, type LienStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: LienStatus }) {
  const unresolved = (UNRESOLVED_STATUSES as string[]).includes(status);
  return (
    <span
      className={`rounded px-2 py-0.5 font-mono text-xs uppercase tracking-wider ${
        unresolved ? "bg-oxblood/10 text-oxblood" : "bg-resolved/10 text-resolved"
      }`}
    >
      {status}
    </span>
  );
}
