// OWNER: Aniketh (stretch)
import { NextResponse } from "next/server";
import { gapList } from "@/lib/location/gaps";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams,
    from = p.get("from")?.trim().toUpperCase(),
    to = p.get("to")?.trim().toUpperCase();
  if (!from || !to || !/^[A-Z]{2}$/.test(from) || !/^[A-Z]{2}$/.test(to))
    return NextResponse.json(
      { error: "Two-letter from and to states required" },
      { status: 400 },
    );
  return NextResponse.json(gapList(from, to));
}
