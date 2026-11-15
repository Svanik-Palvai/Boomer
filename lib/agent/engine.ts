// OWNER: Sunny (step engine). Pure functions over a Job: no I/O, so they're easy to test and safe inside updateJob().
import type { CheckResult, Job, Step, StepResult, Worker } from "@/lib/types";
import { UNCLEAR_RETRIES } from "@/lib/config";
import { SAY } from "@/lib/copy";
import { transition } from "@/lib/jobs/status";
import { ruleById } from "@/lib/location/rules";

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
  // A New here step says what changed (the rule's own words); otherwise the step's reason.
  const rule = step.tag === "new_here" && step.ruleId ? ruleById(step.ruleId) : undefined;
  if (rule?.why) parts.push(rule.why);
  else if (worker.experience === "new" || step.tag === "new_here") parts.push(step.reason);
  return parts.join(" ");
}

/** "Why?": one sentence; for a New here step it names the rule. */
export function explainStep(job: Job, why?: string): string {
  const step = currentStep(job);
  if (!step) return SAY.dontKnow;
  // Only a hand-checked rule is ever cited as a source.
  if (step.tag === "new_here" && step.necSection && step.ruleVerified) {
    return `${why ?? (step.ruleId && ruleById(step.ruleId)?.summary) ?? step.reason} ${SAY.sourceSays} NEC ${step.necSection}, ${job.site?.necEdition ?? ""} edition.`.trim();
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

/**
 * Quick run, for a short demo: the worker says "I've done this before" (ideally "...breaker's off and it tested dead").
 * GFCI swap only. Steps 1-2 count as confirmed only if the worker's own words say so (logged word for word);
 * pulling the old device and turning the GFCI around become spoken steps (no camera); the LINE/LOAD step keeps its
 * camera check; the simulated TEST/RESET step is dropped. Numbering stays as in the full plan.
 */
export const QUICK_PHRASE = /done this before|quick run/i;
export function quickPlan(steps: Step[], said: string): { steps: Step[]; results: StepResult[]; current: number } {
  if (!steps.some((s) => s.id === "gfci-5-line")) return { steps, results: emptyResults(steps), current: 0 };
  const kept = steps
    .filter((s) => s.id !== "gfci-6-test")
    .map((s): Step => {
      if (s.id === "gfci-3-remove")
        return { ...s, check: { kind: "spoken", question: "Did the worker say the old device is out?", prompt: "Tell me when it's out." } };
      if (s.id === "gfci-4-terminals")
        return {
          ...s,
          text: "Turn the new GFCI around so you can see LINE and LOAD on the back.",
          check: { kind: "spoken", question: "Did the worker say they have the back of the GFCI?", prompt: "Tell me when you've got the back facing you." },
        };
      if (s.id === "gfci-5-line") return { ...s, text: "Connect the incoming wires to the LINE pair on the GFCI and leave LOAD covered. Tell me when you're done." };
      return s;
    });
  const saidSafe = /breaker/i.test(said) && /dead|zero|no voltage|nothing/i.test(said);
  const results = emptyResults(kept).map((r) =>
    saidSafe && (r.stepId === "gfci-1-breaker" || r.stepId === "gfci-2-tester")
      ? { ...r, status: "worker_confirmed" as const, attempts: 1, confirmedText: said, doneAt: now() }
      : r,
  );
  const first = results.findIndex((r) => r.status === "pending");
  return { steps: kept, results, current: first < 0 ? 0 : first };
}
