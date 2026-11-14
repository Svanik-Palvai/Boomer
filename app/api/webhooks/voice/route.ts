// OWNER: Zohaib. ElevenLabs post-call webhook -> call summary in job memory. The job stays open so a
// dropped call resumes at the same step, and if the call ended mid-job the worker gets a text saying where they were.
import { NextResponse } from "next/server";
import { firstTimeSeen, getJob, updateJob } from "@/lib/db";
import { stepNumber } from "@/lib/agent/engine";
import { sendText } from "@/lib/photon/send";
import type { Job } from "@/lib/types";
import { resolveJob } from "@/lib/jobs/resolve";
import { summarizeCall } from "@/lib/ai/summarize";
import { remember } from "@/lib/memory/store";
import { verifyElevenLabs } from "@/lib/voice/webhook";

interface PostCall {
  type?: string;
  data?: {
    conversation_id?: string;
    transcript?: { role: string; message?: string }[];
    metadata?: { phone_call?: { external_number?: string } };
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
  const body = JSON.parse(raw || "{}") as PostCall;

  const conversationId = body.data?.conversation_id;
  if (conversationId && !(await firstTimeSeen(`voice:${conversationId}`))) return NextResponse.json({ ok: true, duplicate: true });

  const vars = body.data?.conversation_initiation_client_data?.dynamic_variables ?? {};
  const r = await resolveJob({
    jobId: body.jobId ?? vars.job_id,
    callerPhone: vars.system__caller_id ?? body.data?.metadata?.phone_call?.external_number,
  });
  if (!r) return NextResponse.json({ ok: false, error: "no job for this call" });

  const transcript =
    typeof body.transcript === "string"
      ? body.transcript
      : (body.data?.transcript ?? []).map((t) => `${t.role}: ${t.message ?? ""}`).join("\n");
  const summary = await summarizeCall(transcript);
  await remember(r.job.id, { channel: "voice", agent: "guide", speaker: "system", text: `Call summary: ${summary}` });
  if (conversationId) await updateJob(r.job.id, (j) => ({ ...j, callIds: [...j.callIds, conversationId] }));
  const pickedUp = await pickupText((await getJob(r.job.id)) ?? r.job, r.worker.phone, conversationId);
  return NextResponse.json({ ok: true, jobId: r.job.id, pickupText: pickedUp });
}

/** Call ended while a step was still open: text where they were so they can call back and carry on. */
async function pickupText(job: Job, phone: string, conversationId?: string): Promise<boolean> {
  const n = stepNumber(job);
  if (job.status !== "guiding" || !n) return false;
  const line = process.env.PHOTON_NUMBER;
  const text = `Paused on step ${n} of ${job.steps.length}: ${job.steps[job.current].text}\nCall Boomer${line ? ` at ${line}` : ""} when you're ready and we'll pick up right there.`;
  try {
    await sendText(phone, text, `pickup:${conversationId ?? job.id}`);
    await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text });
    return true;
  } catch (err) {
    console.error("[voice webhook] pick-up text failed:", err);
    return false;
  }
}
