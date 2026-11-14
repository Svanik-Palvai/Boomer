// OWNER: Sunny. Tool next_step: read the current step (starts guiding if the plan is ready).
import { voiceTool } from "@/lib/voice/tool";
import { updateJob } from "@/lib/db";
import { readStep, startGuiding } from "@/lib/agent/engine";

export const POST = voiceTool("next_step", async ({ job, worker }) => {
  if (job.status === "new" || job.status === "looking") return { say: "Tell me what the job is and point the camera at it." };
  const updated = job.status === "plan_ready" ? await updateJob(job.id, startGuiding) : job;
  return { job: updated, say: readStep(updated, worker) };
});
