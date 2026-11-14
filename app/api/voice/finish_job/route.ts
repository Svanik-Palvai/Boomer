// OWNER: Sunny. Tool finish_job: all steps done -> Done -> record + iMessage (Zohaib's closeJob).
import { voiceTool } from "@/lib/voice/tool";
import { updateJob } from "@/lib/db";
import { allDone, finishJob, stepNumber } from "@/lib/agent/engine";
import { closeJob } from "@/lib/jobs/close";

export const POST = voiceTool("finish_job", async ({ job }) => {
  if (!allDone(job)) return { say: `Not yet. You're on step ${stepNumber(job) ?? 1}.` };
  const updated = await updateJob(job.id, finishJob);
  await closeJob(updated);
  return { job: updated, say: "That's the job. I've saved it to your record and texted you the link." };
});
