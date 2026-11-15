// OWNER: Zohaib. ElevenLabs conversation-initiation webhook: runs when a call comes in, before the agent speaks.
// Matches the caller to their open job and hands the agent its job id, talk profile and opening line.
// Request: { caller_id, agent_id, called_number, call_sid, conversation_id } (Twilio and SIP trunk calls alike).
// Auth: ElevenLabs sends the header x-boomer-secret (set as a webhook header secret in ElevenLabs Agents settings).
// The opening line goes out as the dynamic variable {{greeting}}; the agent's First message is set to "{{greeting}}".
// (A first_message override gets SIP-trunk calls rejected with "Override ... not allowed by config", so we don't send one.)
import { NextResponse } from "next/server";
import { resolveJob } from "@/lib/jobs/resolve";
import { stepNumber } from "@/lib/agent/engine";
import { talkProfile } from "@/lib/agent/prompt";
import { SAY } from "@/lib/copy";
import { approvalGate } from "@/lib/jobs/approval";

export async function POST(req: Request) {
  const secret = process.env.VOICE_TOOL_SECRET;
  if (secret && req.headers.get("x-boomer-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { caller_id?: string; conversation_id?: string };
  const r = await resolveJob({ callerPhone: body.caller_id });
  if (!r) {
    return NextResponse.json({
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        job_id: "",
        worker_name: "there",
        talk_profile: talkProfile("new"),
        step_number: "",
        greeting: "Hi, it's Boomer. I don't have a profile for this number yet. Set one up on the Boomer page, then call back.",
      },
    });
  }
  const n = stepNumber(r.job);
  const gate = r.job.status === "plan_ready" ? approvalGate(r.job) : null;
  const first = r.worker.name.split(" ")[0];
  const firstMessage = gate?.wait
    ? `Hey ${first}. ${gate.say}`
    : r.job.status === "plan_ready"
      ? `Hey ${first}. Your plan's ready. Say "let's go" to start.`
      : r.resumed && n
        ? SAY.welcomeBack(n)
        : `Hey ${first}, it's Boomer. What's the job?`;
  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables: {
      job_id: r.job.id,
      worker_name: r.worker.name,
      talk_profile: talkProfile(r.worker.experience),
      step_number: String(n ?? ""),
      greeting: firstMessage,
    },
  });
}
