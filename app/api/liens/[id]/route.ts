import { NextResponse } from "next/server";
import { LIEN_STATUSES, type LienStatus } from "@/lib/db";
import { requireSessionApi } from "@/lib/guard";
import { parseDollarsToCents } from "@/lib/money";
import { getLien, updateLien } from "@/lib/queries";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  if (!getLien(Number(id)))
    return NextResponse.json({ error: "Lien not found." }, { status: 404 });

  const body = await req.json();
  const fields: Parameters<typeof updateLien>[1] = {};

  if (typeof body.provider === "string") {
    const provider = body.provider.trim();
    if (!provider) return NextResponse.json({ error: "Provider can't be empty." }, { status: 400 });
    fields.provider = provider;
  }
  if (typeof body.amount === "string") {
    const cents = parseDollarsToCents(body.amount);
    if (cents === null) return NextResponse.json({ error: "Invalid dollar amount." }, { status: 400 });
    fields.amount_cents = cents;
  }
  if (typeof body.status === "string") {
    if (!(LIEN_STATUSES as readonly string[]).includes(body.status))
      return NextResponse.json({ error: "Unknown status." }, { status: 400 });
    fields.status = body.status as LienStatus;
  }
  if (typeof body.notes === "string") fields.notes = body.notes;

  return NextResponse.json(updateLien(Number(id), fields));
}
