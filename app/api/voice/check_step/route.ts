// OWNER: Sunny. Tool check_step: "done" -> check the current step. Answers in ~3 s.
import type { CheckResult } from "@/lib/types";
import { voiceTool } from "@/lib/voice/tool";
import { recentFrames, requestBurst, updateJob } from "@/lib/db";
import { checkStep } from "@/lib/ai/checkStep";
import { allDone, applyCheck, canConfirmByVoice, confirmSpoken, currentStep, readStep } from "@/lib/agent/engine";
import { SAY } from "@/lib/copy";
import { UNCLEAR_RETRIES } from "@/lib/config";
import { remember } from "@/lib/memory/store";

/** Checker -> shared job memory, so the guide and the iMessage recorder can refer back to it. Fire-and-forget: the check has a ~3 s budget. */
function logCheck(jobId: string, text: string) {
  remember(jobId, { channel: "voice", agent: "checker", speaker: "agent", text }).catch((err) => console.error("[check_step] memory write failed:", err));
}

export const POST = voiceTool("check_step", async ({ job, worker, req }) => {
  const step = currentStep(job);
  if (job.status !== "guiding" || !step) return { say: allDone(job) ? "That's every step. Say finish." : "We haven't started the steps yet." };

  // Spoken checks (and vision steps after repeated "can't tell"): log the worker's confirmation.
  if (step.check.kind === "spoken" || (req.spokenConfirmation && canConfirmByVoice(job))) {
    if (!req.spokenConfirmation) return { say: step.check.prompt ?? SAY.hardGate };
    // TODO(Sunny): judge the confirmation (e.g. tester must read no voltage) before accepting it.
    const updated = await updateJob(job.id, (j) => confirmSpoken(j, req.spokenConfirmation!));
    const check: CheckResult = { outcome: "pass", say: SAY.workerConfirmed };
    logCheck(job.id, `Step ${step.order} worker confirmed: "${req.spokenConfirmation}"`);
    return { job: updated, check, say: `${SAY.workerConfirmed} ${readStep(updated, worker)}` };
  }

  await requestBurst(job.id);
  const frames = await recentFrames(job.id);
  const attempt = job.results[job.current]?.attempts ?? 0;
  const check = await checkStep(step, frames, attempt);

  const updated = await updateJob(job.id, (j) => (j.current === job.current ? applyCheck(j, check) : j));
  logCheck(job.id, `Step ${step.order} camera check: ${check.outcome}. ${check.say}`);
  if (check.outcome === "pass") return { job: updated, check, say: `${check.say} ${readStep(updated, worker)}` };

  const unclear = updated.results[updated.current]?.unclear ?? 0;
  const say = check.outcome === "unclear" && unclear > UNCLEAR_RETRIES ? `${check.say} Or tell me it's done and I'll log it as worker confirmed.` : check.say;
  return { job: updated, check, say };
});
