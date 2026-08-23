import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/guard";
import { parseDollarsToCents } from "@/lib/money";
import { addLien, getCase } from "@/lib/queries";

export async function POST(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json();
  const caseRow = getCase(Number(body.caseId));
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const cents = typeof body.amount === "string" ? parseDollarsToCents(body.amount) : null;
  if (!caseRow || !provider || cents === null)
    return NextResponse.json(
      { error: "Provider and a valid dollar amount are required." },
      { status: 400 },
    );
  return NextResponse.json(addLien(caseRow.id, provider, cents), { status: 201 });
}
