// OWNER: Sunny. Tool wait_for_approval: the plan is out to the supervisor, so hold the call open until they answer.
// The supervisor's text (lib/jobs/approval.ts decideFromText) changes job.approval; this tool sees it within a second
// and returns the decision plus step 1, so the agent speaks it without the worker having to ask.
// It gives up after APPROVAL_WAIT.windowMs with { waiting: true }: the agent hears the worker, then calls it again.
import { voiceTool } from "@/lib/voice/tool";
import { getJob, updateJob } from "@/lib/db";
import { readStep, startGuiding } from "@/lib/agent/engine";
import { approvalGate, markTold } from "@/lib/jobs/approval";
import { APPROVAL_WAIT } from "@/lib/config";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POST = voiceTool("wait_for_approval", async ({ job: first, worker }) => {
  const deadline = Date.now() + APPROVAL_WAIT.windowMs;
  let job: Job | null = first;
  for (;;) {
    if (!job) return { say: "I lost track of this job. Say next and I'll pick it up." };
    // Already started (next_step ran, or no approval needed): read where we are.
    if (job.status !== "plan_ready") return { job, say: readStep(job, worker) };
    const gate = approvalGate(job);
    if (!gate.wait) {
      // Approved (with or without a note): tell the worker, then step 1. Same as next_step.
      const updated = await updateJob(job.id, (j) => (j.status === "plan_ready" ? startGuiding(markTold(j)) : j));
      return { job: updated, say: [gate.intro, readStep(updated, worker)].filter(Boolean).join(" ") };
    }
    // "Hold off" is an answer too: say it once, and stop waiting.
    if (job.approval?.status === "rejected") return { job, say: gate.say };
    if (Date.now() >= deadline) return { job, say: "", waiting: true };
    await sleep(APPROVAL_WAIT.pollMs);
    job = await getJob(job.id);
  }
});
