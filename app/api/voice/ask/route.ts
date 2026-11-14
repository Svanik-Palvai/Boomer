// OWNER: Teammate 3. ElevenLabs server tool "ask_reviewer": voice question -> iMessage to local reviewer.
import { NextResponse } from "next/server";
import { remember } from "@/lib/memory/store";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";

export async function POST(req: Request) {
  const { caseId = DEMO_CASE_ID, question } = (await req.json()) as { caseId?: string; question: string };
  await remember(caseId, { channel: "voice", speaker: "worker", agent: "field", text: question });
  // TODO(T3 + Z): send the question to the local reviewer thread via Photon.
  return NextResponse.json({ ok: true, say: "I texted your local reviewer. I'll call you back with the answer." });
}
