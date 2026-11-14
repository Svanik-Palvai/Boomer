// OWNER: Sunny. Tool check_step: "done" -> check the current step. Answers in ~3 s.
import type { CheckResult } from "@/lib/types";
import { voiceTool } from "@/lib/voice/tool";
import { recentFrames, requestBurst, updateJob } from "@/lib/db";
import { checkStep } from "@/lib/ai/checkStep";
import { allDone, applyCheck, canConfirmByVoice, confirmSpoken, currentStep, readStep } from "@/lib/agent/engine";
import { SAY } from "@/lib/copy";
import { UNCLEAR_RETRIES } from "@/lib/config";
import { judgeConfirmation } from "@/lib/ai/judgeConfirmation";
import { remember } from "@/lib/memory/store";

export const POST = voiceTool("check_step", async ({ job, worker, req }) => {
  const step = currentStep(job);
  if (job.status !== "guiding" || !step) return { say: allDone(job) ? "That's every step. Say finish." : "We haven't started the steps yet." };

  // Spoken checks (and vision steps after repeated "can't tell"): log the worker's confirmation.
  if (step.check.kind === "spoken" || (req.spokenConfirmation && canConfirmByVoice(job))) {
    if (!req.spokenConfirmation) return { say: step.check.prompt ?? SAY.hardGate };
    // The worker's words must actually confirm it: a "no", a vague answer or a live tester reading is asked again.
    const verdict = judgeConfirmation(step, req.spokenConfirmation);
    await remember(job.id, { channel: "voice", agent: "guide", speaker: "worker", text: req.spokenConfirmation });
    if (!verdict.ok) {
      const check: CheckResult = { outcome: "unclear", say: verdict.say ?? SAY.hardGate };
      return { check, say: check.say };
    }
    const updated = await updateJob(job.id, (j) => confirmSpoken(j, req.spokenConfirmation!));
    const check: CheckResult = { outcome: "pass", say: SAY.workerConfirmed };
    return { job: updated, check, say: `${SAY.workerConfirmed} ${readStep(updated, worker)}` };
  }

  await requestBurst(job.id);
  const frames = await recentFrames(job.id);
  const attempt = job.results[job.current]?.attempts ?? 0;
  const check = await checkStep(step, frames, attempt);

  const updated = await updateJob(job.id, (j) => (j.current === job.current ? applyCheck(j, check) : j));
  if (check.outcome === "pass") return { job: updated, check, say: `${check.say} ${readStep(updated, worker)}` };

  const unclear = updated.results[updated.current]?.unclear ?? 0;
  const say = check.outcome === "unclear" && unclear > UNCLEAR_RETRIES ? `${check.say} Or tell me it's done and I'll log it as worker confirmed.` : check.say;
  return { job: updated, check, say };
});
