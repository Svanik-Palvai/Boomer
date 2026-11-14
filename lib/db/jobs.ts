// OWNER: Zohaib (backend)
import type { Job, Worker } from "@/lib/types";
import { backend } from "./backend";
import { newId, nowIso, ready, reseedDemo } from "./memoryStore";

const index = (j: Job) => ({ workerId: j.workerId, jobId: j.id });

export async function getJob(id: string): Promise<Job | null> {
  await ready();
  return backend().get<Job>("job", id);
}

export async function saveJob(job: Job): Promise<Job> {
  await ready();
  const saved = { ...job, updatedAt: nowIso() };
  await backend().put("job", saved.id, saved, index(saved));
  return saved;
}

/**
 * Read-modify-write. `fn` must be synchronous and pure (it can run more than once if two writes race).
 * Do slow work (Gemini) BEFORE calling this, then apply the result inside fn.
 */
export async function updateJob(id: string, fn: (job: Job) => Job): Promise<Job> {
  await ready();
  return backend().update<Job>("job", id, (j) => ({ ...fn(j), updatedAt: nowIso() }), index);
}

export const isOpen = (j: Job) => j.status !== "done" && j.status !== "stopped";

/** The worker's open job, newest first. This is how a dropped call resumes at the same step. */
export async function findOpenJob(workerId: string): Promise<Job | null> {
  const open = (await listJobs(workerId)).filter(isOpen).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return open[0] ?? null;
}

export async function listJobs(workerId: string): Promise<Job[]> {
  await ready();
  return (await backend().list<Job>("job", { workerId })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createJob(worker: Worker): Promise<Job> {
  const now = nowIso();
  return saveJob({
    id: newId("job"),
    workerId: worker.id,
    status: "new",
    home: worker.home,
    steps: [],
    current: 0,
    results: [],
    memory: [],
    callIds: [],
    createdAt: now,
    updatedAt: now,
  });
}

/** Puts the demo worker and demo-2041 back to the start (record, frames, flags too). Other data is kept. */
export async function resetDemo(): Promise<void> {
  await reseedDemo();
}
