// OWNER: Zohaib. The risk model the simulation runs: what can go wrong on a job, and which steps stand in its way.
//
// READ THIS FIRST. Every range below marked "assumption" is a team estimate, not a measurement. Nobody publishes
// per-task numbers like "how often is the wrong breaker switched off". The ranges are wide on purpose, the
// simulation draws from the whole range, and the report only states results that hold across the range (which step
// matters most, and by roughly how much). Do not quote the output as a prediction of injuries. Replace a range with a
// sourced one whenever a source exists, and set `basis` to the link.
//
// A hazard happens when it is present AND every barrier in front of it fails. How likely a barrier is to fail
// depends on how the step was established: not asked at all ("none"), the worker's word ("said"), or a camera
// frame ("seen").
import type { Evidence } from "@/lib/risk/paths";

/** A probability we are unsure of: drawn uniformly between lo and hi on every run. */
export interface Range {
  lo: number;
  hi: number;
  /** "assumption", "eval" (measured by eval/run.mts) or a source URL. */
  basis: string;
  note?: string;
}

export interface Barrier {
  stepId: string;
  /** Chance this step fails to stop the hazard, by how the step was established. */
  failure: Record<Evidence, Range>;
}

export interface Hazard {
  id: string;
  label: string;
  /** Chance the hazard is there to begin with, before any step. */
  present: Range;
  barriers: Barrier[];
  /** Relative weight of the outcome. Only ratios between hazards matter. */
  weight: number;
}

export interface RiskModel {
  jobType: string;
  hazards: Hazard[];
}

const assume = (lo: number, hi: number, note: string): Range => ({ lo, hi, basis: "assumption", note });
const ALWAYS: Range = { lo: 1, hi: 1, basis: "definition", note: "A step nobody asked for stops nothing." };

/**
 * GFCI swap (data/steps.json, job type "gfci-swap").
 * `checkerFalsePass` is the chance the camera check says "looks right" on wrong work. Pass the measured range from
 * the eval results (lib/risk/evalRate.ts) when there is one.
 */
export function gfciSwapModel(checkerFalsePass?: Range): RiskModel {
  const falsePass = checkerFalsePass ?? assume(0.02, 0.15, "Camera check passes wrong work. No eval results found, so this is a guess.");
  return {
    jobType: "gfci-swap",
    hazards: [
      {
        id: "live-contact",
        label: "Hands on a circuit that is still live",
        present: { lo: 1, hi: 1, basis: "definition", note: "The job always puts hands on the conductors." },
        weight: 100,
        barriers: [
          {
            stepId: "gfci-1-breaker",
            failure: {
              none: assume(0.05, 0.3, "Unprompted: breaker left on, or the wrong one switched off (panel labels are often wrong)."),
              said: assume(0.02, 0.15, "Asked and answered out loud: the wrong breaker is still possible."),
              seen: assume(0.01, 0.08, "Panel in frame: a mislabeled breaker still looks off."),
            },
          },
          {
            stepId: "gfci-2-tester",
            failure: {
              none: assume(0.3, 0.8, "Unprompted: no test, or a tester that was never proven on a live source."),
              said: assume(0.03, 0.2, "Worker reports the reading: misread, faulty tester, or said without testing."),
              seen: assume(0.01, 0.06, "Tester in frame at the receptacle while the worker reads it out."),
            },
          },
        ],
      },
      {
        id: "line-load-reversed",
        label: "Incoming wires left on LOAD",
        present: assume(0.05, 0.35, "Worker lands the wires on the wrong pair. Higher for new workers."),
        weight: 10,
        barriers: [
          {
            stepId: "gfci-4-terminals",
            failure: {
              none: ALWAYS,
              said: assume(0.8, 1, "Says they found LINE and LOAD: barely better than not asking."),
              seen: assume(0.5, 0.9, "Labels readable in frame: the worker has at least looked at them."),
            },
          },
          {
            stepId: "gfci-5-line",
            failure: {
              none: ALWAYS,
              said: assume(0.6, 0.95, "Worker's word that the wires are on LINE: the mistake is one they don't know they made."),
              seen: falsePass,
            },
          },
          {
            stepId: "gfci-6-test",
            failure: {
              none: ALWAYS,
              said: assume(0.2, 0.6, "Reported TEST/RESET result: catches it only if the test was really done."),
              seen: assume(0.05, 0.3, "Trip and reset visible in frame."),
            },
          },
        ],
      },
    ],
  };
}

const MODELS: Record<string, (falsePass?: Range) => RiskModel> = { "gfci-swap": gfciSwapModel };

/** The risk model for a job type, or null when nobody has written one (no model, no number). */
export function riskModel(jobType: string | undefined, checkerFalsePass?: Range): RiskModel | null {
  return jobType && MODELS[jobType] ? MODELS[jobType](checkerFalsePass) : null;
}
