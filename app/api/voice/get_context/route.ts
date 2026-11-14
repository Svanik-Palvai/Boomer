// OWNER: Sunny. Tool get_context: called first on every call.
import { voiceTool } from "@/lib/voice/tool";
import { contextFor } from "@/lib/memory/store";
import { readStep, stepNumber } from "@/lib/agent/engine";
import { listRecordEntries } from "@/lib/db";
import { SAY } from "@/lib/copy";

/**
 * Returns the context block, and a line to say:
 * - dropped call on a job under way -> "Welcome back. You were on step N." + the step again
 * - plan ready -> nothing; the agent calls next_step
 */
export const POST = voiceTool("get_context", async ({ job, worker, resumed }) => {
  const past = await listRecordEntries(worker.id).catch(() => []);
  const n = stepNumber(job);
  const say = resumed && n && job.status === "guiding" ? `${SAY.welcomeBack(n)} ${readStep(job, worker)}` : "";
  return { context: contextFor(job, worker, past), say };
});
