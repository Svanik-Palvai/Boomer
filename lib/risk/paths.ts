// OWNER: Zohaib. Walks every state a guided call can reach, through the real step engine, and checks the gate rules
// on each one. Pure: no I/O, no model calls.
//
// The moves are the ones the voice tools allow (app/api/voice/*): a spoken step takes the worker's answer, a vision
// step takes a camera check (pass / fail / unclear) or an explicit "confirm" once the engine allows it, plus go back,
// stop and finish. Tools that only talk (repeat, explain, look, an answer the judge rejects) don't change the job, so
// they are counted as moves that stay in place.
//
// Counters are capped where the engine stops caring (it only asks "more than UNCLEAR_RETRIES can't-tells?" and
// "any not-yets?"), which makes the state space finite, so "every state" is literal.
import type { CheckOutcome, Job, Step, StepResult } from "@/lib/types";
import { UNCLEAR_RETRIES } from "@/lib/config";
import {
  allDone,
  applyCheck,
  canConfirmByVoice,
  confirmSpoken,
  currentStep,
  finishJob,
  goBack,
  SEEN_ONLY_STEPS,
  startGuiding,
  stopJob,
} from "@/lib/agent/engine";

/** How a finished step was established: the worker's word, or a camera frame. */
export type Evidence = "none" | "said" | "seen";

export type MoveName = "start" | "say_yes" | "check_pass" | "check_fail" | "check_unclear" | "confirm" | "go_back" | "stop" | "finish";

/** Moves that never change the job: repeat_step, explain_step, look, and a spoken answer the judge doesn't accept. */
const TALK_ONLY_MOVES = 4;

export interface Move {
  name: MoveName | "injected";
  apply: (job: Job) => Job;
}

const check = (outcome: CheckOutcome) => (job: Job) => applyCheck(job, { outcome, say: "", frameId: outcome === "pass" ? "f" : undefined });

/** The moves the voice tools allow from this job, mirroring the guards in app/api/voice/*. */
export function movesFrom(job: Job): Move[] {
  if (job.status === "done" || job.status === "stopped") return [];
  const moves: Move[] = [{ name: "stop", apply: (j) => stopJob(j, "model check") }];
  if (job.status === "plan_ready" && job.steps.length) moves.push({ name: "start", apply: startGuiding });
  if (job.status !== "guiding") return moves;

  moves.push({ name: "go_back", apply: goBack });
  const step = currentStep(job);
  if (!step) {
    if (allDone(job)) moves.push({ name: "finish", apply: finishJob });
    return moves;
  }
  if (step.check.kind === "spoken") {
    moves.push({ name: "say_yes", apply: (j) => confirmSpoken(j, "yes") });
  } else {
    moves.push({ name: "check_pass", apply: check("pass") }, { name: "check_fail", apply: check("fail") }, { name: "check_unclear", apply: check("unclear") });
    if (canConfirmByVoice(job)) moves.push({ name: "confirm", apply: (j) => confirmSpoken(j, "confirm") });
  }
  return moves;
}

const UNCLEAR_CAP = UNCLEAR_RETRIES + 1;

/** Everything the engine's decisions depend on, and nothing else (no timestamps, no raw counters). */
export function stateKey(job: Job): string {
  const steps = job.results.map((r) => `${r.status[0]}${Math.min(r.unclear, UNCLEAR_CAP)}${r.fails > 0 ? "f" : ""}${r.confirmedText ? "c" : ""}`);
  return `${job.status}|${job.current}|${steps.join(",")}`;
}

export interface Violation {
  rule: string;
  detail: string;
  /** The moves that lead to it, from the start of the call. */
  path: Move["name"][];
}

interface Rule {
  id: string;
  text: string;
  /** Returns what went wrong, or null. `prev` and `move` are the step that led here (absent for the first state). */
  broken: (job: Job, prev?: Job, move?: Move["name"]) => string | null;
}

const finished = (r: StepResult) => r.status === "seen" || r.status === "worker_confirmed";
const label = (s: Step) => `step ${s.order} (${s.id})`;

/** The gate rules. Each is checked on every reachable state and every move. */
export const RULES: Rule[] = [
  {
    id: "order",
    text: "A step is only reached after every step before it is finished (seen on camera or confirmed by the worker).",
    broken: (job) => {
      const open = job.steps.slice(0, job.current).find((_, i) => !finished(job.results[i]));
      return open ? `at step ${job.current + 1} with ${label(open)} unfinished` : null;
    },
  },
  {
    id: "hard-gate",
    text: "A hard gate is only ever passed by the worker's logged spoken confirmation.",
    broken: (job) => {
      const bad = job.steps.slice(0, job.current).find((s, i) => s.hardGate && !(job.results[i].status === "worker_confirmed" && job.results[i].confirmedText));
      return bad ? `${label(bad)} passed without a logged confirmation` : null;
    },
  },
  {
    id: "seen-only",
    text: "A seen-only step is only ever passed by a camera check.",
    broken: (job) => {
      const bad = job.steps.slice(0, job.current).find((s, i) => SEEN_ONLY_STEPS.has(s.id) && job.results[i].status !== "seen");
      return bad ? `${label(bad)} passed without being seen` : null;
    },
  },
  {
    id: "no-guessing",
    text: "\"Not yet\" and \"can't tell\" never move the job forward.",
    broken: (job, prev, move) => (prev && (move === "check_fail" || move === "check_unclear") && job.current > prev.current ? `${move} advanced the job` : null),
  },
  {
    id: "confirm-needs-unclear",
    text: `A camera step is only taken on the worker's word after more than ${UNCLEAR_RETRIES} "can't tell" answer(s) on it.`,
    broken: (job) => {
      const bad = job.steps.find((s, i) => s.check.kind === "vision" && job.results[i].status === "worker_confirmed" && job.results[i].unclear <= UNCLEAR_RETRIES);
      return bad ? `${label(bad)} confirmed by voice after ${job.results[job.steps.indexOf(bad)].unclear} can't-tell(s)` : null;
    },
  },
  {
    id: "finish-needs-all",
    text: "A job is only saved as done when every step is finished.",
    broken: (job) => (job.status === "done" && !(allDone(job) && job.results.every(finished)) ? "done with unfinished steps" : null),
  },
];

/** How each step of a finished job was established. */
export interface TrustProfile {
  key: string;
  evidence: Record<string, Evidence>;
  /** Step ids that needed at least one "not yet" before they were seen. */
  corrected: string[];
  /** Step ids that were camera steps but ended on the worker's word. */
  notSeen: string[];
}

function profileOf(job: Job): TrustProfile {
  const evidence: Record<string, Evidence> = {};
  const notSeen: string[] = [];
  const corrected: string[] = [];
  job.steps.forEach((s, i) => {
    const r = job.results[i];
    evidence[s.id] = r.status === "seen" ? "seen" : "said";
    if (s.check.kind === "vision" && r.status === "worker_confirmed") notSeen.push(s.id);
    if (r.status === "seen" && r.fails > 0) corrected.push(s.id);
  });
  return { key: job.steps.map((s) => evidence[s.id]).join(","), evidence, corrected, notSeen };
}

export interface Exploration {
  states: number;
  /** Moves that change the job. */
  transitions: number;
  /** Finished-job end states, and stopped ones. */
  doneStates: number;
  stoppedStates: number;
  violations: Violation[];
  /** The distinct ways a finished job can be established (seen / said per step). */
  profiles: TrustProfile[];
  /** How many different tool-call sequences of at most `depth` calls exist, counting talk-only tools. */
  sequences: (depth: number) => bigint;
}

/**
 * Breadth-first over every reachable state from `start`, checking every rule on every state and move.
 * `inject` adds moves the tools don't allow; the self-test uses it to prove the rules do catch a broken engine.
 */
export function explore(start: Job, inject?: (job: Job) => Move[]): Exploration {
  const seen = new Map<string, { job: Job; path: Move["name"][] }>();
  const edges = new Map<string, string[]>();
  const violations: Violation[] = [];
  const profiles = new Map<string, TrustProfile>();
  let transitions = 0;

  /** Records any rule this state or move breaks. Returns true when the state is clean. */
  const audit = (job: Job, path: Move["name"][], prev?: Job, move?: Move["name"]): boolean => {
    let clean = true;
    for (const rule of RULES) {
      const detail = rule.broken(job, prev, move);
      if (!detail) continue;
      clean = false;
      if (!violations.some((v) => v.rule === rule.id && v.detail === detail)) violations.push({ rule: rule.id, detail, path });
    }
    return clean;
  };

  const startKey = stateKey(start);
  seen.set(startKey, { job: start, path: [] });
  audit(start, []);
  const queue = [startKey];
  while (queue.length) {
    const key = queue.shift()!;
    const { job, path } = seen.get(key)!;
    const out: string[] = [];
    for (const move of [...movesFrom(job), ...(inject?.(job) ?? [])]) {
      const next = move.apply(job);
      const nextKey = stateKey(next);
      const nextPath = [...path, move.name];
      const clean = audit(next, nextPath, job, move.name);
      out.push(nextKey);
      if (nextKey !== key) transitions++;
      // A state that breaks a rule is reported, not explored further: everything after it is already off the rails.
      if (clean && !seen.has(nextKey)) {
        seen.set(nextKey, { job: next, path: nextPath });
        queue.push(nextKey);
      }
    }
    edges.set(key, out);
    if (job.status === "done") {
      const p = profileOf(job);
      const known = profiles.get(p.key);
      if (!known) profiles.set(p.key, p);
      else known.corrected = [...new Set([...known.corrected, ...p.corrected])];
    }
  }

  const all = [...seen.values()];
  return {
    states: seen.size,
    transitions,
    doneStates: all.filter((s) => s.job.status === "done").length,
    stoppedStates: all.filter((s) => s.job.status === "stopped").length,
    violations,
    profiles: [...profiles.values()],
    sequences: (depth) => countSequences(startKey, edges, depth),
  };
}

/** Number of distinct tool-call sequences of length 1..depth from the start (a closed job takes no more calls). */
function countSequences(startKey: string, edges: Map<string, string[]>, depth: number): bigint {
  let at = new Map<string, bigint>([[startKey, 1n]]);
  let total = 0n;
  for (let d = 0; d < depth; d++) {
    const next = new Map<string, bigint>();
    const add = (k: string, n: bigint) => next.set(k, (next.get(k) ?? 0n) + n);
    for (const [key, ways] of at) {
      const out = edges.get(key) ?? [];
      if (!out.length) continue;
      for (const to of out) add(to, ways);
      add(key, ways * BigInt(TALK_ONLY_MOVES));
    }
    at = next;
    for (const ways of at.values()) total += ways;
  }
  return total;
}

/**
 * Things the walk turns up that are not rule breaks but are worth a look by the engine's owner.
 * Each one is checked by running the engine, not assumed.
 */
export function engineNotes(start: Job): string[] {
  const notes: string[] = [];
  const guiding = startGuiding(start);

  // 1. The engine itself doesn't stop a camera "pass" from finishing a spoken hard gate; only the route does.
  const gate = currentStep(guiding);
  if (gate?.hardGate && gate.check.kind === "spoken") {
    const after = applyCheck(guiding, { outcome: "pass", say: "", frameId: "f" });
    if (after.current > guiding.current) {
      notes.push(
        `applyCheck() will pass ${label(gate)}, a spoken hard gate, on a camera "pass". Today only check_step's route keeps camera checks away from spoken steps; a guard inside applyCheck would make the engine hold the rule itself.`,
      );
    }
  }

  // 2. "Go back" keeps a step's can't-tell count, so the worker can confirm it by voice again without a fresh look.
  let j = guiding;
  while (currentStep(j) && currentStep(j)!.check.kind !== "vision") j = confirmSpoken(j, "yes");
  const vision = currentStep(j);
  if (vision && !SEEN_ONLY_STEPS.has(vision.id)) {
    for (let i = 0; i <= UNCLEAR_RETRIES; i++) j = applyCheck(j, { outcome: "unclear", say: "" });
    j = applyCheck(j, { outcome: "pass", say: "", frameId: "f" });
    j = goBack(j);
    if (currentStep(j)?.id === vision.id && canConfirmByVoice(j)) {
      notes.push(
        `After "go back" to ${label(vision)}, the worker can say "confirm" straight away: the earlier can't-tell count is kept, so the redo needs no new camera look. Resetting the count in goBack() would close that.`,
      );
    }
  }
  return notes;
}
