// OWNER: Sunny. Tool check_step: "done" -> check the current step. Answers in ~3 s.
import type { CheckResult } from "@/lib/types";
import { voiceTool } from "@/lib/voice/tool";
import { framesAfterBurst, requestBurst, updateJob } from "@/lib/db";
import { checkStep } from "@/lib/ai/checkStep";
import { allDone, applyCheck, canConfirmByVoice, confirmSpoken, currentStep, readStep } from "@/lib/agent/engine";
import { SAY } from "@/lib/copy";
import { UNCLEAR_RETRIES } from "@/lib/config";
import { judgeConfirmation } from "@/lib/ai/judgeConfirmation";
import { remember } from "@/lib/memory/store";
import { approvalGate } from "@/lib/jobs/approval";

/** Checker -> shared job memory, so the guide and the iMessage recorder can refer back to it. Fire-and-forget: the check has a ~3 s budget. */
function logCheck(jobId: string, text: string) {
  remember(jobId, { channel: "voice", agent: "checker", speaker: "agent", text }).catch((err) => console.error("[check_step] memory write failed:", err));
}

export const POST = voiceTool("check_step", async ({ job, worker, req }) => {
  const step = currentStep(job);
  if (job.status !== "guiding" || !step) {
    const gate = job.status === "plan_ready" ? approvalGate(job) : null;
    if (gate?.wait) return { say: gate.say };
    return { say: allDone(job) ? "That's every step. Say finish." : "We haven't started the steps yet. Say next to begin." };
  }

  // Spoken checks (and vision steps after repeated "can't tell"): log the worker's confirmation.
  // Vision steps: only an explicit "confirm" (after repeated "can't tell") overrides the camera. "done" never does.
  const explicitConfirm = !!req.spokenConfirmation && /\bconfirm/i.test(req.spokenConfirmation);
  if (step.check.kind === "spoken" || (explicitConfirm && canConfirmByVoice(job))) {
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
    logCheck(job.id, `Step ${step.order} worker confirmed: "${req.spokenConfirmation}"`);
    return { job: updated, check, say: `${SAY.workerConfirmed} ${readStep(updated, worker)}` };
  }

  // Ask the phone for a burst, then wait (up to ~2 s) for it, so the check never judges a still from before "done".
  await requestBurst(job.id);
  const frames = await framesAfterBurst(job.id);
  const attempt = job.results[job.current]?.attempts ?? 0;
  const check = await checkStep(step, frames, attempt);

  const updated = await updateJob(job.id, (j) => (j.current === job.current ? applyCheck(j, check) : j));
  logCheck(job.id, `Step ${step.order} camera check: ${check.outcome}. ${check.say}`);
  if (check.outcome === "pass") return { job: updated, check, say: `${check.say} ${readStep(updated, worker)}` };

  const unclear = updated.results[updated.current]?.unclear ?? 0;
  const say =
    check.outcome === "unclear" && unclear > UNCLEAR_RETRIES && canConfirmByVoice(updated)
      ? `${check.say} If it's done, say "confirm" and I'll log it as worker confirmed, not seen.`
      : check.say;
  return { job: updated, check, say };
});
