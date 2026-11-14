// OWNER: Sunny (AI). POST to clear the guided call on a job (demo resets between rehearsals).
import { NextResponse } from "next/server";
import { resetGuide } from "@/lib/agents/guide";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const caseId = new URL(req.url).searchParams.get("caseId") ?? DEMO_CASE_ID;
  await resetGuide(caseId);
  return NextResponse.json({ ok: true, caseId });
}
