// OWNER: Zohaib. Monte Carlo over the risk model (lib/risk/model.ts): what does it cost when a step is skipped,
// taken on the worker's word, or seen on camera?
//
// Each run draws one value for every uncertain input from its range, then works out the chance of each hazard for a
// set of scenarios. Thousands of runs give a spread, so a result is only reported when it holds across the ranges.
// The outputs are comparisons between scenarios (ratios), which are far steadier than the absolute chances.
import type { Step } from "@/lib/types";
import type { Evidence } from "@/lib/risk/paths";
import type { Range, RiskModel } from "@/lib/risk/model";

/** Small seeded generator (mulberry32) so a report can be reproduced exactly. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type EvidenceMap = Record<string, Evidence>;

interface Draw {
  present: number[];
  /** [hazard][barrier] -> failure chance by evidence. */
  failure: Record<Evidence, number>[][];
}

const pick = (r: Range, rand: () => number) => r.lo + (r.hi - r.lo) * rand();

function draw(model: RiskModel, rand: () => number): Draw {
  return {
    present: model.hazards.map((h) => pick(h.present, rand)),
    failure: model.hazards.map((h) =>
      h.barriers.map((b) => {
        // One draw places all three levels at the same point of their ranges, so "seen" is never worse than "said".
        const u = rand();
        const at = (r: Range) => r.lo + (r.hi - r.lo) * u;
        return { none: at(b.failure.none), said: at(b.failure.said), seen: at(b.failure.seen) };
      }),
    ),
  };
}

/** Chance of each hazard given how every step was established. A step missing from the map counts as "none". */
function hazardChances(model: RiskModel, d: Draw, evidence: EvidenceMap): number[] {
  return model.hazards.map((h, i) => h.barriers.reduce((p, b, k) => p * d.failure[i][k][evidence[b.stepId] ?? "none"], d.present[i]));
}

const weighted = (model: RiskModel, chances: number[]) => chances.reduce((sum, p, i) => sum + p * model.hazards[i].weight, 0);

export interface Spread {
  p5: number;
  median: number;
  p95: number;
}

function spread(values: number[]): Spread {
  const v = [...values].sort((a, b) => a - b);
  const q = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  return { p5: q(0.05), median: q(0.5), p95: q(0.95) };
}

/** The job as designed: spoken steps on the worker's word, camera steps seen. */
export function asDesigned(steps: Step[]): EvidenceMap {
  return Object.fromEntries(steps.map((s) => [s.id, s.check.kind === "spoken" ? "said" : "seen"] as const));
}

export interface StepEffect {
  stepId: string;
  order: number;
  hardGate: boolean;
  /** How it is established in the design. */
  designed: Evidence;
  /** Weighted risk if this step were skipped, as a multiple of the design. */
  ifSkipped: Spread;
  /** Camera steps only: weighted risk if taken on the worker's word instead, as a multiple of the design. */
  ifNotSeen?: Spread;
  /** Spoken steps only: weighted risk if it were seen on camera too, as a multiple of the design (below 1 = better). */
  ifSeen?: Spread;
  /** Share of runs in which skipping this step is the single worst skip. */
  worstSkipShare: number;
}

export interface Simulation {
  runs: number;
  seed: number;
  /** Chance of each hazard per job, as designed and with no steps asked at all. */
  hazards: { id: string; label: string; designed: Spread; unguided: Spread }[];
  /** Weighted risk with no steps asked, as a multiple of the design. */
  unguided: Spread;
  steps: StepEffect[];
  /** Weighted risk of other scenarios (e.g. each way a finished job can be established), as a multiple of the design. */
  scenarios: { name: string; ratio: Spread }[];
}

/**
 * Run the simulation for one job's steps. `scenarios` are extra evidence maps to compare against the design.
 * Steps with no barrier in the model have no effect on the result, and are reported with a ratio of exactly 1.
 */
export function simulate(model: RiskModel, steps: Step[], opts: { runs?: number; seed?: number; scenarios?: { name: string; evidence: EvidenceMap }[] } = {}): Simulation {
  const runs = opts.runs ?? 20_000;
  const seed = opts.seed ?? 2041;
  const rand = seeded(seed);
  const design = asDesigned(steps);
  const none: EvidenceMap = {};
  const scenarios = opts.scenarios ?? [];

  const hazardDesigned = model.hazards.map(() => [] as number[]);
  const hazardUnguided = model.hazards.map(() => [] as number[]);
  const unguided: number[] = [];
  const skipped = steps.map(() => [] as number[]);
  const swapped = steps.map(() => [] as number[]);
  const worst = steps.map(() => 0);
  const scenarioRatios = scenarios.map(() => [] as number[]);

  for (let n = 0; n < runs; n++) {
    const d = draw(model, rand);
    const base = hazardChances(model, d, design);
    const baseRisk = weighted(model, base);
    const bare = hazardChances(model, d, none);
    base.forEach((p, i) => hazardDesigned[i].push(p));
    bare.forEach((p, i) => hazardUnguided[i].push(p));
    unguided.push(weighted(model, bare) / baseRisk);

    let top = -1;
    let topRatio = 1;
    steps.forEach((s, i) => {
      const skip = weighted(model, hazardChances(model, d, { ...design, [s.id]: "none" })) / baseRisk;
      skipped[i].push(skip);
      if (skip > topRatio) [top, topRatio] = [i, skip];
      const other: Evidence = design[s.id] === "seen" ? "said" : "seen";
      swapped[i].push(weighted(model, hazardChances(model, d, { ...design, [s.id]: other })) / baseRisk);
    });
    if (top >= 0) worst[top]++;
    scenarios.forEach((sc, i) => scenarioRatios[i].push(weighted(model, hazardChances(model, d, sc.evidence)) / baseRisk));
  }

  return {
    runs,
    seed,
    hazards: model.hazards.map((h, i) => ({ id: h.id, label: h.label, designed: spread(hazardDesigned[i]), unguided: spread(hazardUnguided[i]) })),
    unguided: spread(unguided),
    steps: steps.map((s, i) => ({
      stepId: s.id,
      order: s.order,
      hardGate: !!s.hardGate,
      designed: design[s.id],
      ifSkipped: spread(skipped[i]),
      ...(design[s.id] === "seen" ? { ifNotSeen: spread(swapped[i]) } : { ifSeen: spread(swapped[i]) }),
      worstSkipShare: worst[i] / runs,
    })),
    scenarios: scenarios.map((sc, i) => ({ name: sc.name, ratio: spread(scenarioRatios[i]) })),
  };
}
