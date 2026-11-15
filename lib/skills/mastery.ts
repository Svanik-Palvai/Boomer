// OWNER: Zohaib. Skill estimates for a worker: which skill a step exercises, how a check moves the estimate,
// and how much Boomer should say for a step given the estimate. Pure functions; lib/db/workers.ts does the saving.
import type { SkillMastery, SkillSummary, Step, Worker } from "@/lib/types";
import { PRIOR, SAID, SEEN, update } from "./bkt";

/** At or above this, a standard step is read in its short form. */
export const KNOWN = 0.9;
/** Below this, every step is read with its reason. */
export const LEARNING = 0.5;

export type Level = "learning" | "practiced" | "known";

/** What a check told Boomer: the camera saw it right, the camera saw it wrong, or the worker said it was done. */
export type Evidence = "seen_right" | "seen_wrong" | "said";

/** Skill names for the record. A step with no `skill` in data/steps.json is its own skill, named by its id. */
const LABELS: Record<string, string> = {
  "de-energize": "Turning the circuit off",
  "verify-dead": "Testing that the circuit is dead",
  "device-removal": "Removing a device",
  "terminal-id": "Identifying terminals",
  "device-termination": "Landing wires on a device",
  "function-test": "Testing the finished device",
};

export const skillOf = (step: Pick<Step, "id" | "skill">): string => step.skill ?? step.id;
export const skillLabel = (skill: string): string => LABELS[skill] ?? skill;

/** The current estimate for a skill; the experience prior until Boomer has watched this worker do it. */
export function masteryOf(worker: Worker, skill: string): number {
  return worker.mastery?.[skill]?.p ?? PRIOR[worker.experience];
}

export function levelOf(p: number): Level {
  return p >= KNOWN ? "known" : p < LEARNING ? "learning" : "practiced";
}

/** The worker after one check on `step`. Returns a new Worker; never mutates. */
export function observe(worker: Worker, step: Pick<Step, "id" | "skill">, evidence: Evidence, at = new Date().toISOString()): Worker {
  const skill = skillOf(step);
  const cur: SkillMastery = worker.mastery?.[skill] ?? { p: PRIOR[worker.experience], checks: 0, right: 0, seen: 0 };
  const right = evidence !== "seen_wrong";
  const next: SkillMastery = {
    p: update(cur.p, right, evidence === "said" ? SAID : SEEN),
    checks: cur.checks + 1,
    right: cur.right + (right ? 1 : 0),
    seen: cur.seen + (evidence === "said" ? 0 : 1),
    updatedAt: at,
  };
  return { ...worker, mastery: { ...worker.mastery, [skill]: next } };
}

/** The skills Boomer has evidence on, for the work record. Strongest first. */
export function skillSummaries(worker: Worker): SkillSummary[] {
  return Object.entries(worker.mastery ?? {})
    .map(([skill, m]) => ({ skill, label: skillLabel(skill), p: m.p, checks: m.checks, right: m.right, seen: m.seen, level: levelOf(m.p) }))
    .sort((a, b) => b.p - a.p || b.checks - a.checks);
}
