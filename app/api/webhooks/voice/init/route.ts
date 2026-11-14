// OWNER: Zohaib. ElevenLabs conversation-initiation webhook: runs when a call comes in, before the agent speaks.
// Matches the caller to their open job and hands the agent its job id, talk profile and opening line.
// TODO(Zohaib): confirm request/response shape against the ElevenLabs Twilio/SIP personalization docs.
import { NextResponse } from "next/server";
import { resolveJob } from "@/lib/jobs/resolve";
import { stepNumber } from "@/lib/agent/engine";
import { talkProfile } from "@/lib/agent/prompt";
import { SAY } from "@/lib/copy";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { caller_id?: string; conversation_id?: string };
  const r = await resolveJob({ callerPhone: body.caller_id });
  if (!r) {
    return NextResponse.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: { job_id: "", worker_name: "there", talk_profile: talkProfile("new") },
    });
  }
  const n = stepNumber(r.job);
  const firstMessage = r.resumed && n ? SAY.welcomeBack(n) : `Hi ${r.worker.name.split(" ")[0]}, it's Boomer. What's the job?`;
  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables: {
      job_id: r.job.id,
      worker_name: r.worker.name,
      talk_profile: talkProfile(r.worker.experience),
      step_number: String(n ?? ""),
    },
    conversation_config_override: { agent: { first_message: firstMessage } },
  });
}
