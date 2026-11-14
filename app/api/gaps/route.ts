// OWNER: Aniketh (stretch). GET ?from=PA&to=NJ -> GapItem[]
import { NextResponse } from "next/server";
import { gapList } from "@/lib/location/gaps";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from");
  const to = p.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  return NextResponse.json(gapList(from, to));
}
