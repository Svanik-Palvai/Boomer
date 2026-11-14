// OWNER: Zohaib (caller-to-job matching)
import type { Job, Worker } from "@/lib/types";
import { USE_MOCKS } from "@/lib/config";
import { createJob, findOpenJob, getJob, getWorker, getWorkerByPhone } from "@/lib/db";
import { DEMO_JOB_ID } from "@/lib/mock/demo";

export interface Resolved {
  job: Job;
  worker: Worker;
  /** True when this call picked up a job that was already under way (dropped call). */
  resumed: boolean;
}

/**
 * Find the job a call, a frame upload or a tool call belongs to.
 * Order: explicit jobId → worker's open job (by workerId or caller phone) → new job for that worker.
 * In mock mode an unknown caller falls back to demo-2041 so browser test calls work.
 */
export async function resolveJob(q: { jobId?: string; workerId?: string; callerPhone?: string }): Promise<Resolved | null> {
  if (q.jobId) {
    const job = await getJob(q.jobId);
    const worker = job && (await getWorker(job.workerId));
    if (job && worker) return { job, worker, resumed: job.status === "guiding" };
  }

  const worker =
    (q.workerId && (await getWorker(q.workerId))) || (q.callerPhone && (await getWorkerByPhone(q.callerPhone))) || null;

  if (worker) {
    const open = await findOpenJob(worker.id);
    if (open) return { job: open, worker, resumed: open.status === "guiding" };
    return { job: await createJob(worker), worker, resumed: false };
  }

  if (USE_MOCKS) {
    const job = await getJob(DEMO_JOB_ID);
    const demoWorker = job && (await getWorker(job.workerId));
    if (job && demoWorker) return { job, worker: demoWorker, resumed: job.status === "guiding" };
  }
  return null;
}
