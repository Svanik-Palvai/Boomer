// OWNER: Sunny. Tool repeat_step: same words, nothing new added.
import { voiceTool } from "@/lib/voice/tool";
import { readStep } from "@/lib/agent/engine";

export const POST = voiceTool("repeat_step", async ({ job, worker }) => ({ say: readStep(job, worker) }));
