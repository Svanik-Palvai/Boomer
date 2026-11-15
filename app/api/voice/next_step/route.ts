// OWNER: Sunny. Tool next_step: read the current step (starts guiding if the plan is ready).
import { voiceTool } from "@/lib/voice/tool";
import { updateJob } from "@/lib/db";
import { readStep, startGuiding } from "@/lib/agent/engine";
import { approvalGate, markTold } from "@/lib/jobs/approval";

export const POST = voiceTool("next_step", async ({ job, worker }) => {
  if (job.status === "new" || job.status === "looking") return { say: "Tell me what the job is and point the camera at it." };
  if (job.status === "plan_ready") {
    // Waits for the supervisor's OK; once it's in, tells the worker the decision (and any note) before step 1.
    const gate = approvalGate(job);
    if (gate.wait) return { say: gate.say };
    const updated = await updateJob(job.id, (j) => startGuiding(markTold(j)));
    return { job: updated, say: [gate.intro, readStep(updated, worker)].filter(Boolean).join(" ") };
  }
  return { job, say: readStep(job, worker) };
});
