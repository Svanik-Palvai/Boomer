// OWNER: Z (backend). Screens poll this every 2s for live updates.
import { NextResponse } from "next/server";
import { getCase } from "@/lib/cases/store";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(c);
}
