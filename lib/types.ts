export const LIEN_STATUSES = [
  "asserted",
  "verified",
  "negotiating",
  "reduced",
  "paid",
  "waived",
] as const;
export type LienStatus = (typeof LIEN_STATUSES)[number];

// Gate-blocking: amount or validity still unknown at disbursement time.
export const UNRESOLVED_STATUSES: LienStatus[] = ["asserted", "negotiating"];

export type Case = {
  id: number;
  title: string;
  status: "open" | "closed";
  created_at: string;
};

export type Lien = {
  id: number;
  case_id: number;
  provider: string;
  amount_cents: number;
  status: LienStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};
