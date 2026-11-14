// OWNER: Sunny (AI). Read-only state for the live job view (laptop facing the judge):
// current step, step list with results, the agent's last line, newest frame, and the record.
import { NextResponse } from "next/server";
import { getCase } from "@/lib/cases/store";
import { jobRecord } from "@/lib/agents/guide";
import { lastFrameAny } from "@/lib/ai/frames";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caseId = new URL(req.url).searchParams.get("caseId") ?? DEMO_CASE_ID;
  const c = await getCase(caseId);
  if (!c) return NextResponse.json({ error: `no case ${caseId}` }, { status: 404 });
  const g = c.guide;
  const frame = lastFrameAny(caseId);
  return NextResponse.json({
    caseId,
    status: g?.status ?? "new",
    current: g ? g.current + 1 : 0,
    total: g?.steps.length ?? 0,
    lastLine: g?.lastLine ?? null,
    steps: g?.steps.map((s, i) => ({ ...s, result: g.results[i] })) ?? [],
    frame: frame ? { at: frame.at, image: frame.image } : null,
    record: jobRecord(c),
  });
}
