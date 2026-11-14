// OWNER: Teammate 3. ElevenLabs server tool "get_case_context".
import { NextResponse } from "next/server";
import { contextFor } from "@/lib/memory/store";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";

export async function GET(req: Request) {
  const caseId = new URL(req.url).searchParams.get("caseId") ?? DEMO_CASE_ID;
  return NextResponse.json({ context: await contextFor(caseId, "field") });
}
