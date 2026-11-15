// OWNER: Zohaib. Bayesian knowledge tracing (Corbett & Anderson, 1995): one probability per worker per skill that
// they have the skill down, updated by every step check. Pure math, no I/O.
//
//   P(known | right) = p(1-slip) / (p(1-slip) + (1-p)guess)
//   P(known | wrong) = p·slip    / (p·slip    + (1-p)(1-guess))
//   then they may learn from the attempt:  p' = P(known | obs) + (1 - P(known | obs))·transit
//
// The parameters are the usual textbook starting values, not fitted: there isn't enough call data yet to fit them.
import type { Experience } from "@/lib/types";

export interface BktParams {
  /** Chance an attempt teaches the skill to someone who didn't have it. */
  transit: number;
  /** Chance someone who has the skill still gets it wrong. */
  slip: number;
  /** Chance someone without the skill still gets it right. */
  guess: number;
}

/** A camera check: the work was seen right or wrong, so it is strong evidence. */
export const SEEN: BktParams = { transit: 0.15, slip: 0.1, guess: 0.2 };

/** A spoken confirmation: Boomer only has the worker's word, so "right" tells it much less (high guess). */
export const SAID: BktParams = { transit: 0.15, slip: 0.1, guess: 0.5 };

/** Where the estimate starts before Boomer has watched this worker do the skill. */
export const PRIOR: Record<Experience, number> = { new: 0.2, journeyman: 0.9 };

const clamp = (p: number) => Math.min(0.99, Math.max(0.01, p));

/** One observation -> the new probability the worker has the skill. */
export function update(p: number, correct: boolean, k: BktParams = SEEN): number {
  const prior = clamp(p);
  const posterior = correct
    ? (prior * (1 - k.slip)) / (prior * (1 - k.slip) + (1 - prior) * k.guess)
    : (prior * k.slip) / (prior * k.slip + (1 - prior) * (1 - k.guess));
  return clamp(posterior + (1 - posterior) * k.transit);
}
