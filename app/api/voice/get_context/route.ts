// OWNER: Sunny. Tool get_context: called first on every call.
import { voiceTool } from "@/lib/voice/tool";
import { contextFor } from "@/lib/memory/store";
import { stepNumber } from "@/lib/agent/engine";
import { SAY } from "@/lib/copy";

export const POST = voiceTool("get_context", async ({ job, worker, resumed }) => {
  const n = stepNumber(job);
  return {
    context: contextFor(job, worker),
    say: resumed && n ? SAY.welcomeBack(n) : "",
  };
});
