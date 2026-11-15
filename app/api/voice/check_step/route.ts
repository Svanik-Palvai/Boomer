// OWNER: Sunny. Tool check_step: "done" -> check the current step. Answers in ~3 s.
import type { CheckResult } from "@/lib/types";
import { background, voiceTool } from "@/lib/voice/tool";
import { framesAfterBurst, requestBurst, updateJob, updateWorker } from "@/lib/db";
import { observe, type Evidence } from "@/lib/skills/mastery";
import type { Job, Step, VoiceToolResponse, Worker } from "@/lib/types";
import { checkStep, voteSummary } from "@/lib/ai/checkStep";
import { allDone, applyCheck, canConfirmByVoice, confirmAfterFix, confirmSpoken, currentStep, misses, readStep, startGuiding } from "@/lib/agent/engine";
import { SAY } from "@/lib/copy";
import { judgeConfirmation } from "@/lib/ai/judgeConfirmation";
import { remember } from "@/lib/memory/store";
import { approvalGate, markTold } from "@/lib/jobs/approval";

/** Checker -> shared job memory, so the guide and the iMessage recorder can refer back to it. Fire-and-forget: the check has a ~3 s budget. */
function logCheck(jobId: string, text: string) {
  background(remember(jobId, { channel: "voice", agent: "checker", speaker: "agent", text }));
}

/**
 * One check -> the worker's skill estimate. Returns the updated worker so the next step is read at the new level.
 * A failed save must never fail the check, so it falls back to the worker as it was.
 */
async function learn(worker: Worker, step: Step, evidence: Evidence): Promise<Worker> {
  try {
    return await updateWorker(worker.id, (w) => observe(w, step, evidence));
  } catch (err) {
    console.error("[check_step] skill estimate not saved:", err);
    return worker;
  }
}

export const POST = voiceTool("check_step", async ({ job, worker, req }) => {
  const step = currentStep(job);
  if (job.status !== "guiding" || !step) {
    const gate = job.status === "plan_ready" ? approvalGate(job) : null;
    if (gate?.wait) return { say: gate.say };
    // The supervisor's OK is in: start step 1 now (same as next_step), instead of asking the worker to say next.
    if (gate && job.steps.length) {
      const updated = await updateJob(job.id, (j) => startGuiding(markTold(j)));
      return { job: updated, say: [gate.intro, readStep(updated, worker)].filter(Boolean).join(" ") };
    }
    return { say: allDone(job) ? "That's every step. Say finish." : "We haven't started the steps yet. Say next to begin." };
  }

  // Spoken checks (and vision steps after repeated "can't tell"): log the worker's confirmation.
  // Vision steps: only an explicit "confirm" (after repeated "can't tell") overrides the camera. "done" never does.
  const explicitConfirm = !!req.spokenConfirmation && /\bconfirm/i.test(req.spokenConfirmation);
  if (step.check.kind === "spoken" || (explicitConfirm && canConfirmByVoice(job))) {
    // The agent only calls check_step when the worker said done/check: on a step that isn't a safety gate,
    // a missing spokenConfirmation counts as "done" instead of asking again.
    if (!req.spokenConfirmation) {
      if (step.hardGate || step.check.kind !== "spoken") return { say: step.check.prompt ?? SAY.hardGate };
      req.spokenConfirmation = "done";
    }
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
    // Count it only if this call is the one that moved the step (a duplicate delivery changes nothing).
    const after = updated.current > job.current ? await learn(worker, step, "said") : worker;
    return { job: updated, check, say: `${SAY.workerConfirmed} ${readStep(updated, after)}` };
  }

  // Quick run (scripted demo, triggered by "I've done this before"): step 5 doesn't use the camera.
  // First check: the LOAD catch. Next check: the move to LINE passes and the job is done. Normal runs never get here.
  const quickRun = !job.steps.some((s) => s.id === "gfci-6-test");
  if (step.id === "gfci-5-line" && quickRun) {
    const caught = (job.results[job.current]?.fails ?? 0) >= 1;
    if (!caught) {
      const check: CheckResult = { outcome: "fail", say: "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE." };
      const updated = await updateJob(job.id, (j) => (j.current === job.current ? applyCheck(j, check) : j));
      logCheck(job.id, `Step ${step.order} check (quick run): fail. ${check.say}`);
      return { job: updated, check, say: check.say };
    }
    // A duplicate call right after the catch (agent retry) is not the worker's fix: repeat the catch.
    if (Date.now() - Date.parse(job.updatedAt) < 4000) {
      return { say: "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE." };
    }
    const text = req.spokenConfirmation || "moved both wires to LINE";
    const updated = await updateJob(job.id, (j) => (j.current === job.current ? confirmAfterFix(j, text) : j));
    logCheck(job.id, `Step ${step.order} worker confirmed after the LOAD catch: "${text}"`);
    const check: CheckResult = { outcome: "pass", say: "Looks right." };
    return { job: updated, check, say: `Looks right. ${readStep(updated, worker)}` };
  }

  // The agent sometimes fires check_step several times in a few seconds (it hears "yeah" while a check is still running,
  // or takes the answer to the last step as "done" for this one). Each of those used to run a full check and count as
  // another miss, so three "not yet"s landed in ten seconds. One check at a time, and none the worker can't have earned:
  const key = `${job.id}:${step.id}`;
  const prior = vision.get(key);
  // 1. A check for this step is still running: this call gets that check's answer.
  if (prior && !prior.doneAt) return prior.run;
  // 2. A check for this step answered "not yet" or "can't tell" a moment ago: nothing can have changed, say it again.
  const lastAt = Math.max(prior?.doneAt ?? 0, job.lastSay?.tool === "check_step" ? Date.parse(job.lastSay.at) : 0);
  const result = job.results[job.current];
  if ((result?.attempts ?? 0) > 0 && Date.now() - lastAt < recheckMinMs()) return { say: prior ? (await prior.run).say : job.lastSay!.text };
  // 3. The step was only just read out: the worker can't have done it yet, so there is nothing to check or to say.
  if ((result?.attempts ?? 0) === 0 && result?.startedAt && Date.now() - Date.parse(result.startedAt) < stepMinMs()) return { say: "" };

  const entry: { run: Promise<VoiceToolResponse & { job?: Job }>; doneAt?: number } = { run: visionCheck(job, worker, step, req.spokenConfirmation) };
  vision.set(key, entry);
  entry.run.then(
    () => (entry.doneAt = Date.now()),
    () => vision.delete(key),
  );
  return entry.run;
});

/** A second check on the same step sooner than this after a "not yet" repeats the answer instead of checking again. */
const recheckMinMs = () => Number(process.env.RECHECK_MIN_MS ?? 4000);
/** A check sooner than this after the step was read out is ignored. Both are read per call so the scripted sims can turn them off. */
const stepMinMs = () => Number(process.env.STEP_MIN_MS ?? 3000);
/** job:step -> the camera check running or last run for it. Per server instance; job.lastSay covers the other instances. */
const vision = new Map<string, { run: Promise<VoiceToolResponse & { job?: Job }>; doneAt?: number }>();

async function visionCheck(job: Job, worker: Worker, step: Step, said?: string): Promise<VoiceToolResponse & { job?: Job }> {
  // Ask the phone for a burst, then wait (up to ~2.5 s) for it, so the check never judges a still from before "done".
  await requestBurst(job.id);
  const frames = await framesAfterBurst(job.id);
  const attempt = job.results[job.current]?.attempts ?? 0;
  // What the worker said about the step goes to the checker as a pointer for where to look (never as proof).
  const check = await checkStep(step, frames, attempt, { said, misses: misses(job) });

  const updated = await updateJob(job.id, (j) => (j.current === job.current ? applyCheck(j, check) : j));
  logCheck(job.id, `Step ${step.order} camera check: ${check.outcome}${check.votes?.length ? ` (${voteSummary(check.votes)})` : ""}. ${check.say}`);
  // "Can't tell" says nothing about the worker, so only a pass or a "not yet" that was applied moves the estimate.
  const counted = (updated.results[job.current]?.attempts ?? 0) > attempt && check.outcome !== "unclear";
  const after = counted ? await learn(worker, step, check.outcome === "pass" ? "seen_right" : "seen_wrong") : worker;
  if (check.outcome === "pass") return { job: updated, check, say: `${check.say} ${readStep(updated, after)}` };

  // The camera has missed this step enough times: the worker's word is taken from here on ("not yet" counts too).
  const say = canConfirmByVoice(updated) ? `${check.say} If it's right, say "confirm" and I'll log it as worker confirmed.` : check.say;
  return { job: updated, check, say };
}
