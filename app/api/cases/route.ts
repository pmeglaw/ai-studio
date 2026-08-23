import { NextResponse } from "next/server";
import { requireSessionApi } from "@/lib/guard";
import { createCase, listOpenCases } from "@/lib/queries";

export async function GET(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(listOpenCases());
}

export async function POST(req: Request) {
  if (!(await requireSessionApi(req)))
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title)
    return NextResponse.json({ error: "A case title is required." }, { status: 400 });
  return NextResponse.json(createCase(title), { status: 201 });
}
