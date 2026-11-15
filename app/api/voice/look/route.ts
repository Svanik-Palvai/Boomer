// OWNER: Sunny. Tool look: frames -> job identity -> plan -> read step 1. Mid-job it describes the frame.
import { voiceTool } from "@/lib/voice/tool";
import { recentFrames, updateJob } from "@/lib/db";
import { identifyJob } from "@/lib/ai/identifyJob";
import { buildPlan } from "@/lib/ai/buildPlan";
import { emptyResults, readStep, startGuiding } from "@/lib/agent/engine";
import { transition } from "@/lib/jobs/status";
import { jobTemplate } from "@/lib/location/steps";
import { approvalGate, requestApproval, supervisorLabel } from "@/lib/jobs/approval";

export const POST = voiceTool("look", async ({ job, worker, req }) => {
  const frames = await recentFrames(job.id);
  const identity = await identifyJob(frames, req.note);

  // "What am I looking at?" mid-job: describe, don't re-plan.
  if (job.status === "guiding") {
    if (identity.fallbackReason === "no_frame") return { say: "No camera picture. Check the camera page is open." };
    if (identity.fallbackReason) return { say: "Couldn't read the picture. Try again." };
    return { say: identity.details ?? `A ${identity.component}.` };
  }

  // Plan already sent for sign-off (look called twice): don't rebuild or text the supervisor again.
  if (job.status === "plan_ready" && job.approval) {
    const gate = approvalGate(job);
    return { say: gate.wait ? gate.say : "Plan's ready. Say let's go." };
  }

  const jobType = identity.jobType;
  const template = jobType ? jobTemplate(jobType) : undefined;
  if (!jobType || !template) {
    const updated = await updateJob(job.id, (j) => ({ ...transition(j, "looking"), identity }));
    return { job: updated, say: `That's a ${identity.component}. I don't have steps for that job yet.` };
  }

  const steps = buildPlan(jobType, job.home, job.site);
  const planned = await updateJob(job.id, (j) => ({
    ...transition(j, "plan_ready"),
    identity,
    jobType,
    title: template.title,
    steps,
    results: emptyResults(steps),
    current: 0,
    approval: undefined,
  }));

  // Short on purpose: what the job is, what's different here, then straight on. The worker can ask for more.
  const newHere = steps.filter((s) => s.tag === "new_here").length;
  const differs = job.site && newHere ? ` ${newHere} step${newHere === 1 ? " is" : "s are"} different in ${job.site.city}.` : "";
  const seen = identity.fallbackReason
    ? `Going by what you said: ${identity.problem}.${differs}`
    : `Got it: ${identity.problem}.${differs}`;

  // Supervisor on file: send the plan for their OK and wait in "plan ready". next_step starts once they answer.
  const asked = await requestApproval(planned, worker);
  if (asked?.approval && asked.approval.delivery !== "none") {
    const who = supervisorLabel(asked.approval);
    return { job: asked, say: `${seen} Sent the plan to ${who}. I'll start when they answer.` };
  }

  // No supervisor, or they can't be reached yet: start without sign-off, and say so.
  const unreachable = asked?.approval ? `Couldn't reach ${supervisorLabel(asked.approval)}, so starting without their OK. ` : "";
  const updated = await updateJob(job.id, (j) => startGuiding({ ...j, approval: undefined }));
  return { job: updated, say: `${seen} ${unreachable}${readStep(updated, worker)}` };
});
