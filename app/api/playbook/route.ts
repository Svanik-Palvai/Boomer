// OWNER: Teammate 3 (AI)
import { NextResponse } from "next/server";
import { searchPlaybook } from "@/lib/ai/playbook";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await searchPlaybook(q));
}
