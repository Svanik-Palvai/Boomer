// OWNER: Sunny. Tool look: frames -> job identity -> plan -> read step 1. Mid-job it describes the frame.
import { voiceTool } from "@/lib/voice/tool";
import { recentFrames, updateJob } from "@/lib/db";
import { identifyJob } from "@/lib/ai/identifyJob";
import { buildPlan } from "@/lib/ai/buildPlan";
import { emptyResults, QUICK_PHRASE, quickPlan, readStep, startGuiding } from "@/lib/agent/engine";
import { transition } from "@/lib/jobs/status";
import { jobTemplate } from "@/lib/location/steps";
import { approvalGate, requestApproval, supervisorLabel } from "@/lib/jobs/approval";
import { DEMO_JOB_TYPE } from "@/lib/mock/demo";

export const POST = voiceTool("look", async ({ job, worker, req }) => {
  const frames = await recentFrames(job.id);
  // Keep look under the voice agent's tool timeout: if Gemini is slow, go by what the worker said instead of
  // timing out (a timed-out look gets retried by the agent and texts the supervisor twice).
  const IDENTIFY_MS = Number(process.env.IDENTIFY_TIMEOUT_MS || 6500);
  // Quick run: the job is known from the script, so skip the vision call entirely (instant look).
  const scripted = QUICK_PHRASE.test(req.note ?? "");
  const identity = scripted
    ? { component: "standard receptacle", problem: "an outlet to swap for a GFCI", jobType: DEMO_JOB_TYPE, confidence: 1, source: "fallback" as const }
    : await Promise.race([
    identifyJob(frames, req.note),
    new Promise<Awaited<ReturnType<typeof identifyJob>>>((resolve) =>
      setTimeout(() => resolve({ component: "standard receptacle", problem: "an outlet to swap for a GFCI", jobType: DEMO_JOB_TYPE, confidence: 0, source: "fallback", fallbackReason: "model_error", fallbackError: "identify timed out" }), IDENTIFY_MS),
    ),
  ]);

  // "What am I looking at?" mid-job: describe, don't re-plan.
  if (job.status === "guiding") {
    if (identity.fallbackReason === "no_frame") return { say: "No camera picture. Check the camera page is open." };
    if (identity.fallbackReason) return { say: "Couldn't read the picture. Try again." };
    return { say: identity.details ?? `A ${identity.component}.` };
  }

  // Plan already sent for sign-off (look called twice): don't rebuild or text the supervisor again.
  if (job.status === "plan_ready" && job.approval) {
    // "I've done this before" said after the plan went out: switch the waiting plan to the quick run, keep the approval.
    if (QUICK_PHRASE.test(req.note ?? "") && job.steps.some((s) => s.id === "gfci-6-test")) {
      const q = quickPlan(job.steps, req.note ?? "");
      await updateJob(job.id, (j) => ({ ...j, steps: q.steps, results: q.results, current: q.current }));
    }
    const gate = approvalGate(job);
    return { say: gate.wait ? gate.say : "Plan's ready. Say let's go." };
  }

  // Gemini sometimes answers "none" when the worker doesn't say "GFCI" ("the outlet behind the fridge").
  // An outlet in frame is the outlet swap: use that playbook rather than stopping.
  const jobType =
    identity.jobType ??
    (/receptacle|outlet|gfci/i.test(`${identity.component} ${identity.problem} ${req.note ?? ""}`) ? DEMO_JOB_TYPE : undefined);
  const template = jobType ? jobTemplate(jobType) : undefined;
  if (!jobType || !template) {
    const updated = await updateJob(job.id, (j) => ({ ...transition(j, "looking"), identity }));
    return { job: updated, say: `That's a ${identity.component}. I don't have steps for that job yet.` };
  }

  const full = buildPlan(jobType, job.home, job.site);
  // "I've done this before": the short demo run (see quickPlan).
  const quick = QUICK_PHRASE.test(req.note ?? "");
  const plan = quick ? quickPlan(full, req.note ?? "") : { steps: full, results: emptyResults(full), current: 0 };
  const steps = plan.steps;
  const planned = await updateJob(job.id, (j) => ({
    ...transition(j, "plan_ready"),
    identity,
    jobType,
    title: template.title,
    steps,
    results: plan.results,
    current: plan.current,
    approval: undefined,
  }));
  const skipped = plan.current > 0;
  const quickLine = quick ? (skipped ? " Short version, since you've done this before. Breaker and tester logged." : " Short version, since you've done this before.") : "";

  // Short on purpose: what the job is, what's different here, then straight on. The worker can ask for more.
  const newHere = steps.filter((s) => s.tag === "new_here").length;
  const differs = job.site && newHere ? ` ${newHere} step${newHere === 1 ? " is" : "s are"} different in ${job.site.city}.` : "";
  const seen = identity.fallbackReason
    ? `Going by what you said: ${identity.problem}.${differs}`
    : `Got it: ${identity.problem}.${differs}`;

  // Supervisor on file: send the plan for their OK and wait in "plan ready". next_step starts once they answer.
  // Quick run: plain text only (the mini app card can take seconds to send on Photon 1.0).
  const asked = await requestApproval(planned, worker, { skipCard: quick });
  if (asked?.approval && asked.approval.delivery !== "none") {
    const who = supervisorLabel(asked.approval);
    return { job: asked, say: `${seen}${quickLine} Sent the plan to ${who}. I'll start when they answer.` };
  }

  // No supervisor, or they can't be reached yet: start without sign-off, and say so.
  const unreachable = asked?.approval ? `Couldn't reach ${supervisorLabel(asked.approval)}, so starting without their OK. ` : "";
  const updated = await updateJob(job.id, (j) => startGuiding({ ...j, approval: undefined }));
  return { job: updated, say: `${seen}${quickLine} ${unreachable}${readStep(updated, worker)}` };
});
