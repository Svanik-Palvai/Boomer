// OWNER: Zohaib. Which steps a supervisor should look at, and when. Pure.
//
// A step is flagged only when things line up: the step matters (lib/risk/simulate.ts), AND either the worker is new
// to it, it was taken on their word, or the camera has said "not yet". An experienced worker doing the same step
// cleanly is not flagged, so the sheet stays quiet unless there is something to look at.
//
// The sheet shows levels, never the simulation's numbers: most of the model's inputs are estimates (lib/risk/model.ts).
import type { Experience, Job, Step } from "@/lib/types";
import { riskModel } from "@/lib/risk/model";
import { simulate } from "@/lib/risk/simulate";

/** How much a step matters: what skipping it does to the modelled risk. */
export type Weight = "high" | "elevated" | "routine";

/** High: skipping it costs at least this much even at the favourable end of the ranges (5th percentile). */
const HIGH_AT_P5 = 1.5;
/** Elevated: skipping it typically costs at least this much (median). */
const ELEVATED_AT_MEDIAN = 1.25;
/** Below this estimate the worker counts as new to a skill. Matches LEARNING in lib/skills/mastery.ts (PR #16). */
const NEW_TO_SKILL = 0.5;

/** The slice of a worker the flags need. `mastery` arrives with the skill estimates (PR #16); absent until then. */
export interface WatchWorker {
  experience: Experience;
  mastery?: Record<string, { p: number }>;
}

const cache = new Map<string, Record<string, Weight>>();

/** Each step's weight for this job. Every step is "routine" when the job type has no risk model. */
export function stepWeights(job: Pick<Job, "jobType" | "steps">): Record<string, Weight> {
  const key = `${job.jobType}|${job.steps.map((s) => s.id).join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const model = riskModel(job.jobType);
  const weights: Record<string, Weight> = Object.fromEntries(job.steps.map((s) => [s.id, "routine" as Weight]));
  if (model && job.steps.length) {
    for (const s of simulate(model, job.steps, { runs: 4000 }).steps) {
      weights[s.stepId] = s.ifSkipped.p5 >= HIGH_AT_P5 ? "high" : s.ifSkipped.median >= ELEVATED_AT_MEDIAN ? "elevated" : "routine";
    }
  }
  cache.set(key, weights);
  return weights;
}

/** True when Boomer's estimate says the worker doesn't have this step's skill down yet. */
export function newToStep(worker: WatchWorker | null | undefined, step: Step): boolean {
  if (!worker) return false;
  const skill = (step as Step & { skill?: string }).skill ?? step.id;
  const p = worker.mastery?.[skill]?.p;
  return p === undefined ? worker.experience === "new" : p < NEW_TO_SKILL;
}

export interface StepWatch {
  weight: Weight;
  /** Why the supervisor should look at this step now, or undefined when there is nothing to look at. */
  flag?: string;
}

/** The weight and flag for step `i` of a job. Flags clear by themselves as the step is redone and seen. */
export function watchStep(job: Job, i: number, worker?: WatchWorker | null): StepWatch {
  const step = job.steps[i];
  const r = job.results[i];
  const weight = stepWeights(job)[step.id] ?? "routine";
  if (weight === "routine" || !r) return { weight };

  const kind = weight === "high" ? "High-risk" : "Higher-risk";
  const isNew = newToStep(worker, step);
  const onNow = i === job.current && job.status === "guiding";
  const done = r.status === "seen" || r.status === "worker_confirmed";

  if (!done && r.fails > 0) return { weight, flag: `${kind} step: the camera has said "not yet" ${r.fails === 1 ? "once" : `${r.fails} times`}.` };
  if (onNow && isNew) return { weight, flag: `${kind} step, and new to this worker.` };
  if (r.status === "worker_confirmed" && step.check.kind === "vision") return { weight, flag: `${kind} step taken on the worker's word. The camera never saw it.` };
  if (r.status === "worker_confirmed" && isNew) return { weight, flag: `${kind} step, new to this worker, taken on their word.` };
  return { weight };
}
