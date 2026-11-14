// OWNER: Zohaib. ElevenLabs post-call webhook -> call summary in job memory. The job stays open so a
// dropped call resumes at the same step.
import { callEvidence } from "@/lib/lessons/hooks";
import { NextResponse } from "next/server";
import { firstTimeSeen, updateJob } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";
import { summarizeCall } from "@/lib/ai/summarize";
import { remember } from "@/lib/memory/store";
import { verifyElevenLabs } from "@/lib/voice/webhook";

interface PostCall {
  type?: string;
  data?: {
    conversation_id?: string;
    transcript?: { role: string; message?: string; time_in_call_secs?: number }[];
    metadata?: { start_time_unix_secs?: number; call_duration_secs?: number; phone_call?: { external_number?: string } };
    conversation_initiation_client_data?: { dynamic_variables?: Record<string, string> };
  };
  // Local testing shortcut: { jobId, transcript: "..." }
  jobId?: string;
  transcript?: string;
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyElevenLabs(raw, req.headers.get("elevenlabs-signature")))
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  let body:PostCall;
  try {body=JSON.parse(raw||'{}') as PostCall;}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid event'},{status:400});
  if(body.type && body.type!=='post_call_transcription')return NextResponse.json({ok:true,ignored:true});

  const conversationId = body.data?.conversation_id;


  const vars = body.data?.conversation_initiation_client_data?.dynamic_variables ?? {};
  const r = await resolveJob({
    jobId: body.jobId ?? vars.job_id,
    callerPhone: vars.system__caller_id ?? body.data?.metadata?.phone_call?.external_number,
  });
  if (!r) return NextResponse.json({ ok: false, error: "no job for this call" });

  if (body.data && body.type === "post_call_transcription") await callEvidence(r.job, body.data);
  if (conversationId && !(await firstTimeSeen(`voice:${conversationId}`))) return NextResponse.json({ ok: true, duplicate: true });

  const transcript =
    typeof body.transcript === "string"
      ? body.transcript
      : (body.data?.transcript ?? []).map((t) => `${t.role}: ${t.message ?? ""}`).join("\n");
  const summary = await summarizeCall(transcript);
  await remember(r.job.id, { channel: "voice", agent: "guide", speaker: "system", text: `Call summary: ${summary}` });
  if (conversationId) await updateJob(r.job.id, (j) => ({ ...j, callIds: [...j.callIds, conversationId] }));
  return NextResponse.json({ ok: true, jobId: r.job.id });
}
