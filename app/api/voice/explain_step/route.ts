// OWNER: Sunny. Tool explain_step ("why?"): one sentence; for New here it names the rule.
import { voiceTool } from "@/lib/voice/tool";
import { currentStep, explainStep } from "@/lib/agent/engine";
import { ruleById } from "@/lib/location/rules";
import { remember } from "@/lib/memory/store";

export const POST = voiceTool("explain_step", async ({ job }) => {
  const step = currentStep(job);
  const rule = step?.ruleId ? ruleById(step.ruleId) : undefined;
  const say = explainStep(job, rule?.verified ? rule.why : undefined);
  if (rule) await remember(job.id, { channel: "voice", agent: "guide", speaker: "agent", text: `Explained ${rule.necSection}: ${rule.sourceUrl}` });
  return { say };
});
