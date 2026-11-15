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
  const identity = await identifyJob(frames, req.note);

  // "What am I looking at?" mid-job: describe, don't re-plan.
  if (job.status === "guiding") {
    if (identity.fallbackReason === "no_frame") return { say: "I don't have a picture from the camera right now. Check the camera page is open and pointed at the work." };
    if (identity.fallbackReason) return { say: "I couldn't read the camera picture just now. Try again in a second." };
    const seen = identity.details ?? `I see a ${identity.component}.`;
    return { say: `${seen} That is just what I see. Say "check" and I'll judge this step.` };
  }

  // Plan already sent for sign-off (look called twice): don't rebuild or text the supervisor again.
  if (job.status === "plan_ready" && job.approval) {
    // "I've done this before" said after the plan went out: switch the waiting plan to the quick run, keep the approval.
    if (QUICK_PHRASE.test(req.note ?? "") && job.steps.some((s) => s.id === "gfci-6-test")) {
      const q = quickPlan(job.steps, req.note ?? "");
      await updateJob(job.id, (j) => ({ ...j, steps: q.steps, results: q.results, current: q.current }));
    }
    const gate = approvalGate(job);
    return { say: gate.wait ? gate.say : "Your plan's ready. Say let's go to start." };
  }

  // Gemini sometimes answers "none" when the worker doesn't say "GFCI" ("the outlet behind the fridge").
  // An outlet in frame is the outlet swap: use that playbook rather than stopping.
  const jobType =
    identity.jobType ??
    (/receptacle|outlet|gfci/i.test(`${identity.component} ${identity.problem} ${req.note ?? ""}`) ? DEMO_JOB_TYPE : undefined);
  const template = jobType ? jobTemplate(jobType) : undefined;
  if (!jobType || !template) {
    const updated = await updateJob(job.id, (j) => ({ ...transition(j, "looking"), identity }));
    return { job: updated, say: `I see a ${identity.component}, but I don't have a checked step list for that job yet.` };
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
  const quickLine = quick
    ? skipped
      ? " You've done this before, so I'll keep it short. I logged what you said about the breaker and the tester."
      : " You've done this before, so I'll keep it short."
    : "";

  const newHere = steps.filter((s) => s.tag === "new_here").length;
  const where = job.site
    ? `I have you in ${job.site.city}, ${job.site.state}, and you work out of ${job.home.city}${newHere ? `, so ${newHere} step${newHere === 1 ? " is" : "s are"} different here` : ""}.`
    : "I don't have your location yet; keep the camera page open.";
  const seen =
    identity.fallbackReason === "no_frame"
      ? `I can't see the camera yet, so I'm going by what you said: ${identity.problem}. ${where}`
      : identity.fallbackReason
        ? `I couldn't read the camera picture, so I'm going by what you said: ${identity.problem}. ${where}`
        : `I can see ${identity.problem}. ${where}`;

  // Supervisor on file: send the plan for their OK and wait in "plan ready". next_step starts once they answer.
  const asked = await requestApproval(planned, worker);
  if (asked?.approval && asked.approval.delivery !== "none") {
    const who = supervisorLabel(asked.approval);
    return { job: asked, say: `${seen}${quickLine} The plan has ${steps.length} steps. I sent it to ${who} to approve, and I'll start as soon as they answer.` };
  }

  // No supervisor, or they can't be reached yet: start without sign-off, and say so.
  const unreachable = asked?.approval ? `I couldn't reach ${supervisorLabel(asked.approval)} with the plan, so we'll start without their OK. ` : "";
  const updated = await updateJob(job.id, (j) => startGuiding({ ...j, approval: undefined }));
  return { job: updated, say: `${seen}${quickLine} ${unreachable}${readStep(updated, worker)}` };
});
