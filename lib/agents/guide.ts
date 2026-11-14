// OWNER: Sunny (AI). The step engine behind the voice agent's tools.
import type { Case, GuideState, GuideStep, GuideStepResult, TalkProfile } from "@/lib/types";
import { getCase, saveCase } from "@/lib/cases/store";
import { buildGuidePlan } from "@/lib/ai/guidePlan";
import { checkStep } from "@/lib/ai/checkStep";
import { recentFrames } from "@/lib/ai/frames";
import { remember } from "@/lib/memory/store";

/**
 * Rules this file enforces (the voice agent only speaks what it gets back):
 * - A step advances only on a vision pass or a logged spoken confirmation.
 * - The two hard gates (breaker off, tester shows dead) need an explicit "yes"; they can't be skipped.
 * - "Can't tell" twice -> the worker may confirm out loud; it's logged "worker confirmed, not seen".
 * - Wording: "looks right", "not yet", "can't tell from here", "worker confirmed".
 *   Never "safe", "compliant", "approved", "passed".
 */

export interface ToolReply {
  say: string;
  status: GuideState["status"];
  step?: { number: number; total: number; id: string; text: string; tag: GuideStep["tag"]; checkMode: string; hardGate: boolean };
  result?: "pass" | "fail" | "unclear" | "confirmed" | "not_confirmed";
  sourceUrl?: string;
}

const TOTAL_LIMIT = 400; // keep spoken lines short

async function load(caseId: string): Promise<Case> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`no case ${caseId}`);
  return c;
}

function freshState(c: Case, profile: TalkProfile): GuideState {
  const steps = buildGuidePlan(c.job, c.checks, undefined, profile);
  return {
    status: "plan_ready",
    profile,
    steps,
    current: 0,
    results: steps.map((s) => ({ stepId: s.id, outcome: "pending", attempts: 0 })),
    unclearStreak: 0,
  };
}

async function save(c: Case, g: GuideState, say: string, workerSaid?: string): Promise<ToolReply> {
  g.lastLine = say;
  await saveCase({ ...c, guide: g, status: g.status === "done" ? "done" : g.status === "guiding" ? "guiding" : c.status });
  if (workerSaid) await remember(c.id, { channel: "voice", agent: "field", speaker: "worker", text: workerSaid });
  await remember(c.id, { channel: "voice", agent: "field", speaker: "agent", text: say });
  return reply(g, say);
}

function reply(g: GuideState, say: string, extra: Partial<ToolReply> = {}): ToolReply {
  const s = g.steps[g.current];
  return {
    say: say.slice(0, TOTAL_LIMIT),
    status: g.status,
    step:
      s && g.status !== "done"
        ? {
            number: g.current + 1,
            total: g.steps.length,
            id: s.id,
            text: s.text,
            tag: s.tag,
            checkMode: s.check.mode,
            hardGate: !!s.hardGate,
          }
        : undefined,
    sourceUrl: s?.sourceUrl,
    ...extra,
  };
}

/** The line the agent reads for the current step, shaped by the talk profile. */
export function stepLine(g: GuideState): string {
  const s = g.steps[g.current];
  if (!s) return "That's every step.";
  const head = `Step ${g.current + 1} of ${g.steps.length}.`;
  if (g.profile === "journeyman" && s.tag === "standard" && !s.hardGate) {
    // licensed worker: standard steps are short, no reasons
    return `${head} ${s.text}`;
  }
  if (g.profile === "new_electrician") return `${head} ${s.text} ${s.reason}`;
  return `${head} ${s.text}`;
}

/** Start (or resume) the guided job. A resumed call picks up at the same step. */
export async function startGuide(caseId: string, profile?: TalkProfile): Promise<ToolReply> {
  const c = await load(caseId);
  const g0 = c.guide;
  if (g0 && (g0.status === "guiding" || g0.status === "plan_ready")) {
    const g = { ...g0, status: "guiding" as const };
    const done = g.results.filter((r) => r.outcome !== "pending").length;
    const say = done
      ? `Welcome back, picking up where we stopped. ${stepLine(g)}`
      : stepLine(g);
    return save(c, g, say);
  }
  const g = freshState(c, profile ?? c.worker?.profile ?? "new_electrician");
  g.status = "guiding";
  g.startedAt = new Date().toISOString();
  const newHere = g.steps.filter((s) => s.tag === "new_here").length;
  const where = `${c.job.site.city}, ${c.job.site.state}`;
  const intro = `I have ${g.steps.length} steps for this ${c.job.component} in ${where}${
    newHere ? `, and ${newHere === 1 ? "one is" : `${newHere} are`} different from ${c.job.home.city || c.job.home.state}` : ""
  }. Say repeat, why, go back, or done at any point.`;
  return save(c, g, `${intro} ${stepLine(g)}`);
}

export async function currentStep(caseId: string): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide || c.guide.status === "new") return startGuide(caseId);
  if (c.guide.status === "done") return reply(c.guide, "This job is finished.");
  return reply(c.guide, stepLine(c.guide));
}

export async function repeatStep(caseId: string): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide) return startGuide(caseId);
  return save(c, c.guide, stepLine(c.guide), "repeat");
}

export async function whyStep(caseId: string): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide) return startGuide(caseId);
  const s = c.guide.steps[c.guide.current];
  const say = s ? (s.tag === "new_here" ? `${s.reason} The source is saved in your record.` : s.reason) : "We're done.";
  return save(c, c.guide, say, "why?");
}

export async function goBack(caseId: string): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide) return startGuide(caseId);
  const g = { ...c.guide, current: Math.max(0, c.guide.current - 1), unclearStreak: 0 };
  return save(c, g, `Going back. ${stepLine(g)}`, "go back");
}

/**
 * Worker said "done" / "check".
 * confirmed: what the worker answered for a spoken check (true = yes). Also used to confirm
 * a step out loud after two "can't tell" results.
 */
export async function checkCurrent(caseId: string, confirmed?: boolean): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide) return startGuide(caseId);
  const g: GuideState = { ...c.guide, results: c.guide.results.map((r) => ({ ...r })) };
  if (g.status === "done" || g.status === "stopped") return reply(g, g.status === "done" ? "This job is finished." : "This job was stopped.");
  const s = g.steps[g.current];
  const res = g.results[g.current];

  // Spoken checks: the worker's answer is the check.
  if (s.check.mode === "spoken") {
    if (confirmed === true) return advance(c, g, "worker_confirmed", undefined, "yes");
    const say = s.hardGate
      ? `I need a clear yes before we go on. ${s.check.question}`
      : `${s.check.question} Say yes when it is.`;
    return { ...(await save(c, g, say, confirmed === false ? "no" : "done")), result: "not_confirmed" };
  }

  // Two "can't tell" in a row: accept a spoken confirmation, logged as not seen.
  if (g.unclearStreak >= 2 && confirmed === true) {
    return advance(c, g, "worker_confirmed_not_seen", undefined, "confirm");
  }

  const check = await checkStep(s, recentFrames(caseId, 3));
  if (check.result === "pass") return advance(c, g, "seen", check.frameAt, "done", "Looks right.");

  res.attempts += 1;
  if (check.result === "fail") {
    g.unclearStreak = 0;
    return { ...(await save(c, g, check.say, "done")), result: "fail" };
  }
  g.unclearStreak += 1;
  const say =
    g.unclearStreak >= 2
      ? "I still can't tell from here. If it's done, say confirm and I'll log it as worker confirmed, not seen."
      : check.say;
  return { ...(await save(c, g, say, "done")), result: "unclear" };
}

async function advance(
  c: Case,
  g: GuideState,
  outcome: GuideStepResult["outcome"],
  frameAt: string | undefined,
  workerSaid: string,
  prefix = outcome === "seen" ? "Looks right." : "Got it.",
): Promise<ToolReply> {
  const res = g.results[g.current];
  res.outcome = outcome;
  res.frameAt = frameAt;
  res.at = new Date().toISOString();
  g.unclearStreak = 0;
  if (g.current + 1 >= g.steps.length) {
    g.status = "done";
    g.finishedAt = res.at;
    const r = await save(c, g, `${prefix} That's the job. I'm sending the record to your phone now.`, workerSaid);
    return { ...r, result: outcome === "seen" ? "pass" : "confirmed" };
  }
  g.current += 1;
  const r = await save(c, g, `${prefix} Next. ${stepLine(g)}`, workerSaid);
  return { ...r, result: outcome === "seen" ? "pass" : "confirmed" };
}

export async function stopGuide(caseId: string): Promise<ToolReply> {
  const c = await load(caseId);
  if (!c.guide) return reply(freshState(c, "new_electrician"), "There's no job running.");
  const g = { ...c.guide, status: "stopped" as const, finishedAt: new Date().toISOString() };
  return save(c, g, "Stopping here. Make the work safe, leave the breaker off, and call me back when you're ready.", "stop");
}

/** Close the job (called after the last step or at hang-up). Returns the record summary for the iMessage text. */
export async function finishGuide(caseId: string): Promise<ToolReply & { record: JobRecord | null }> {
  const c = await load(caseId);
  const g = c.guide;
  if (!g) return { ...reply(freshState(c, "new_electrician"), "There's no job to close."), record: null };
  const record = jobRecord({ ...c, guide: g });
  const say = g.status === "done" ? "Your job record is on its way." : `Saved where we stopped, at step ${g.current + 1}. Call back to pick it up.`;
  return { ...reply(g, say), record };
}

export interface JobRecord {
  caseId: string;
  date: string;
  place: string;
  codeEdition: string;
  job: string;
  status: GuideState["status"];
  minutes?: number;
  steps: { n: number; text: string; tag: string; outcome: string; attempts: number; frameAt?: string; sourceUrl?: string }[];
  totals: { seen: number; workerConfirmed: number; corrected: number };
  label: "observed by Boomer";
}

/** One entry for the worker's record. Labeled "observed by Boomer", never "certified". */
export function jobRecord(c: Case): JobRecord | null {
  const g = c.guide;
  if (!g) return null;
  const steps = g.steps.map((s, i) => {
    const r = g.results[i];
    return { n: i + 1, text: s.text, tag: s.tag, outcome: r.outcome, attempts: r.attempts, frameAt: r.frameAt, sourceUrl: s.sourceUrl };
  });
  const mins =
    g.startedAt && g.finishedAt ? Math.max(1, Math.round((Date.parse(g.finishedAt) - Date.parse(g.startedAt)) / 60000)) : undefined;
  return {
    caseId: c.id,
    date: (g.finishedAt ?? new Date().toISOString()).slice(0, 10),
    place: `${c.job.site.city}, ${c.job.site.state}`,
    codeEdition: `NEC ${c.job.site.necEdition}`,
    job: `${c.job.component}: ${c.job.task}`,
    status: g.status,
    minutes: mins,
    steps,
    totals: {
      seen: steps.filter((s) => s.outcome === "seen").length,
      workerConfirmed: steps.filter((s) => s.outcome.startsWith("worker_confirmed")).length,
      corrected: steps.filter((s) => s.attempts > 0).length,
    },
    label: "observed by Boomer",
  };
}

/** Reset the guide for the demo case (keeps the rest of the case). */
export async function resetGuide(caseId: string): Promise<void> {
  const c = await load(caseId);
  await saveCase({ ...c, guide: undefined });
}
