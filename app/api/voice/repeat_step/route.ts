// OWNER: Sunny. Tool repeat_step: same words, nothing new added.
import { voiceTool } from "@/lib/voice/tool";
import { readStep } from "@/lib/agent/engine";
import { approvalGate } from "@/lib/jobs/approval";

export const POST = voiceTool("repeat_step", async ({ job, worker }) => {
  const gate = job.status === "plan_ready" ? approvalGate(job) : null;
  return { say: gate?.wait ? gate.say : readStep(job, worker) };
});
