// OWNER: Zohaib (job state machine)
import type { Job, JobStatus } from "@/lib/types";

/** New → Looking → Plan ready → Guiding → Done, and Stopped from anywhere open. */
const NEXT: Record<JobStatus, JobStatus[]> = {
  new: ["looking", "plan_ready", "stopped"],
  looking: ["looking", "plan_ready", "stopped"],
  plan_ready: ["looking", "guiding", "stopped"],
  guiding: ["guiding", "done", "stopped"],
  done: [],
  stopped: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return from === to || NEXT[from].includes(to);
}

/** Returns the job with the new status, or throws if the move isn't allowed. Pure. */
export function transition(job: Job, to: JobStatus): Job {
  if (!canTransition(job.status, to)) throw new Error(`Job ${job.id}: can't go from ${job.status} to ${to}`);
  const now = new Date().toISOString();
  return {
    ...job,
    status: to,
    ...(to === "guiding" && !job.startedAt && { startedAt: now }),
    ...((to === "done" || to === "stopped") && { finishedAt: now }),
  };
}
