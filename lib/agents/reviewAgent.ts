// OWNER: Teammate 3 (agents + memory)
import type { Case, Stage } from "@/lib/types";
import { contextFor } from "@/lib/memory/store";

/**
 * REVIEW AGENT (iMessage). Runs the local-electrician and manager threads.
 * Sends a mini app card first; free-text replies go through parseReply as the fallback.
 * Every inbound reply and card decision is written to shared memory.
 */
export async function cardIntro(c: Case, stage: Stage): Promise<string> {
  // TODO(T3): use contextFor + Gemini to write this; keep it under 300 characters.
  const newSteps = c.plan.filter((s) => s.tag === "new_here").length;
  return stage === "local"
    ? `[Case ${c.id}] ${c.job.component}, ${c.job.site.city} ${c.job.site.state}. ${newSteps} steps are new here. Is this how you'd do it? Tap the card or reply.`
    : `[Case ${c.id}] The local electrician reviewed the ${c.job.site.city} plan. Approve? Tap the card or reply YES / NO.`;
}

export async function reviewContext(c: Case): Promise<string> {
  return contextFor(c.id, "review");
}
