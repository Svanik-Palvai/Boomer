// OWNER: Z (backend). ElevenLabs post-call webhook -> shared memory.
import { NextResponse } from "next/server";
import { remember } from "@/lib/memory/store";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";

/**
 * TODO(Z): verify the ElevenLabs webhook signature, map the caller's number to a case,
 * and store a short summary (T3 can supply a summarizer) instead of the raw transcript.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { caseId?: string; summary?: string; transcript?: string };
  const text = body.summary ?? body.transcript ?? "(empty call)";
  await remember(body.caseId ?? DEMO_CASE_ID, { channel: "voice", speaker: "worker", agent: "field", text });
  return NextResponse.json({ ok: true });
}
