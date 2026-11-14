// OWNER: Sunny. Tool look: frames -> job identity -> plan -> read step 1. Mid-job it describes the frame.
import { voiceTool } from "@/lib/voice/tool";
import { recentFrames, updateJob } from "@/lib/db";
import { identifyJob } from "@/lib/ai/identifyJob";
import { buildPlan } from "@/lib/ai/buildPlan";
import { emptyResults, readStep, startGuiding } from "@/lib/agent/engine";
import { transition } from "@/lib/jobs/status";
import { jobTemplate } from "@/lib/location/steps";

export const POST = voiceTool("look", async ({ job, worker, req }) => {
  const frames = await recentFrames(job.id);
  const identity = await identifyJob(frames, req.note);

  // "What am I looking at?" mid-job: describe, don't re-plan.
  if (job.status === "guiding") {
    return { say: identity.details ?? `I see a ${identity.component}.` };
  }

  const jobType = identity.jobType;
  const template = jobType ? jobTemplate(jobType) : undefined;
  if (!jobType || !template) {
    const updated = await updateJob(job.id, (j) => ({ ...transition(j, "looking"), identity }));
    return { job: updated, say: `I see a ${identity.component}, but I don't have a checked step list for that job yet.` };
  }

  const steps = buildPlan(jobType, job.home, job.site);
  const updated = await updateJob(job.id, (j) =>
    startGuiding({
      ...transition(j, "plan_ready"),
      identity,
      jobType,
      title: template.title,
      steps,
      results: emptyResults(steps),
      current: 0,
    }),
  );

  const newHere = steps.filter((s) => s.tag === "new_here").length;
  const where = job.site
    ? `I have you in ${job.site.city}, ${job.site.state}, and you work out of ${job.home.city}${newHere ? `, so ${newHere} step${newHere === 1 ? " is" : "s are"} different here` : ""}.`
    : "I don't have your location yet; keep the camera page open.";
  return { job: updated, say: `I can see ${identity.problem}. ${where} ${readStep(updated, worker)}` };
});
