// OWNER: Sunny. Tool stop_job: stop guiding, mark the job Stopped, save what was done.
import { voiceTool } from "@/lib/voice/tool";
import { updateJob } from "@/lib/db";
import { stopJob } from "@/lib/agent/engine";
import { closeJob } from "@/lib/jobs/close";
import { SAY } from "@/lib/copy";

export const POST = voiceTool("stop_job", async ({ job, req }) => {
  const updated = await updateJob(job.id, (j) => stopJob(j, req.reason));
  await closeJob(updated);
  return { job: updated, say: SAY.stop };
});
