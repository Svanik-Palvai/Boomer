// OWNER: Sunny. Tool go_back.
import { voiceTool } from "@/lib/voice/tool";
import { updateJob } from "@/lib/db";
import { goBack, readStep } from "@/lib/agent/engine";

export const POST = voiceTool("go_back", async ({ job, worker }) => {
  if (job.status !== "guiding") return { say: "We haven't started the steps yet." };
  const updated = await updateJob(job.id, goBack);
  return { job: updated, say: readStep(updated, worker) };
});
