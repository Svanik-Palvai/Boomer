// OWNER: Teammate 4 (location)
import { NextResponse } from "next/server";
import { getJurisdiction } from "@/lib/checks/jurisdiction";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return NextResponse.json(await getJurisdiction(Number(p.get("lat")), Number(p.get("lng"))));
}
