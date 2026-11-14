// OWNER: Sunny (step engine). Pure functions over a Job: no I/O, so they're easy to test and safe inside updateJob().
import type { CheckResult, Job, Step, StepResult, Worker } from "@/lib/types";
import { UNCLEAR_RETRIES } from "@/lib/config";
import { SAY } from "@/lib/copy";
import { transition } from "@/lib/jobs/status";

const now = () => new Date().toISOString();

export function currentStep(job: Job): Step | null {
  return job.steps[job.current] ?? null;
}

/** 1-based step number while guiding, else null. */
export function stepNumber(job: Job): number | null {
  if (job.status !== "guiding" && job.status !== "plan_ready") return null;
  return job.current < job.steps.length ? job.current + 1 : null;
}

export function allDone(job: Job): boolean {
  return job.steps.length > 0 && job.current >= job.steps.length;
}

function patchResult(job: Job, fn: (r: StepResult) => StepResult): Job {
  const results = job.results.map((r, i) => (i === job.current ? fn(r) : r));
  return { ...job, results };
}

/** Plan ready → Guiding at step 1. No-op if already guiding. */
export function startGuiding(job: Job): Job {
  if (job.status === "guiding") return job;
  const started = transition(job, "guiding");
  return patchResult(started, (r) => ({ ...r, startedAt: r.startedAt ?? now() }));
}

/**
 * The line the agent reads for the current step. One step at a time, never the whole plan.
 * Talk profile: "new" gets the reason with every step; "journeyman" gets short text for standard steps.
 */
export function readStep(job: Job, worker: Worker): string {
  const step = currentStep(job);
  if (!step) return "That's every step. Say finish and I'll save the job to your record.";
  const parts: string[] = [`Step ${step.order}.`];
  if (step.tag === "new_here") {
    parts.push(SAY.differentFrom(job.home.city));
    if (step.ruleVerified === false) parts.push("The source for this one is still being checked.");
  }
  const short = worker.experience === "journeyman" && step.tag === "standard" && step.shortText;
  parts.push(short || step.text);
  if (worker.experience === "new" || step.tag === "new_here") parts.push(step.reason);
  return parts.join(" ");
}

/** "Why?": one sentence; for a New here step it names the rule. */
export function explainStep(job: Job, why?: string): string {
  const step = currentStep(job);
  if (!step) return SAY.dontKnow;
  // Only a hand-checked rule is ever cited as a source.
  if (step.tag === "new_here" && step.necSection && step.ruleVerified) {
    return `${why ?? step.reason} ${SAY.sourceSays} NEC ${step.necSection}, ${job.site?.necEdition ?? ""} edition.`.trim();
  }
  return step.reason;
}

/** The worker may confirm out loud: spoken steps, or a vision step after "can't tell" more than UNCLEAR_RETRIES times. */
/** Vision steps that must be SEEN: the camera has to pass them, a spoken "confirm" never does (the caught mistake lives here). */
export const SEEN_ONLY_STEPS = new Set(["gfci-5-line"]);

export function canConfirmByVoice(job: Job): boolean {
  const step = currentStep(job);
  const r = job.results[job.current];
  if (!step || !r) return false;
  if (step.check.kind === "spoken") return true;
  if (SEEN_ONLY_STEPS.has(step.id)) return false;
  return r.unclear > UNCLEAR_RETRIES;
}

/** Apply a vision check. Advances only on "pass". Never turns "unclear" into "pass". */
export function applyCheck(job: Job, check: CheckResult): Job {
  const step = currentStep(job);
  if (!step) return job;
  let next = patchResult(job, (r) => ({
    ...r,
    attempts: r.attempts + 1,
    fails: r.fails + (check.outcome === "fail" ? 1 : 0),
    unclear: r.unclear + (check.outcome === "unclear" ? 1 : 0),
    status: check.outcome === "pass" ? "seen" : check.outcome === "fail" ? "not_yet" : r.status,
    ...(check.outcome === "pass" && { frameId: check.frameId, doneAt: now() }),
  }));
  if (check.outcome === "pass") next = advance(next);
  return next;
}

/** A logged spoken confirmation ("breaker's off", "tester reads zero"). Caller must check canConfirmByVoice first. */
export function confirmSpoken(job: Job, text: string): Job {
  if (!canConfirmByVoice(job)) return job;
  const next = patchResult(job, (r) => ({
    ...r,
    attempts: r.attempts + 1,
    status: "worker_confirmed",
    confirmedText: text,
    doneAt: now(),
  }));
  return advance(next);
}

function advance(job: Job): Job {
  const moved = { ...job, current: job.current + 1 };
  return moved.current < moved.steps.length
    ? patchResult(moved, (r) => ({ ...r, startedAt: r.startedAt ?? now() }))
    : moved;
}

/** "Go back": previous step, which has to be checked again. */
export function goBack(job: Job): Job {
  if (job.current === 0) return job;
  const back = { ...job, current: job.current - 1 };
  return patchResult(back, (r) => ({ ...r, status: "pending", frameId: undefined, doneAt: undefined }));
}

export function stopJob(job: Job, reason?: string): Job {
  return { ...transition(job, "stopped"), stoppedReason: reason };
}

export function finishJob(job: Job): Job {
  return transition(job, "done");
}

/** Fresh results array for a new plan. */
export function emptyResults(steps: Step[]): StepResult[] {
  return steps.map((s) => ({ stepId: s.id, status: "pending", attempts: 0, fails: 0, unclear: 0 }));
}
