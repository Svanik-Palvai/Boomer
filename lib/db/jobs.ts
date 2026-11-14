// OWNER: Zohaib (backend)
import type { Job, Worker } from "@/lib/types";
import { newId, nowIso, resetTables, tables } from "./memoryStore";

export async function getJob(id: string): Promise<Job | null> {
  return tables().jobs.get(id) ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  const saved = { ...job, updatedAt: nowIso() };
  tables().jobs.set(saved.id, saved);
  return saved;
}

/**
 * Read-modify-write. `fn` must be synchronous so no other write can land in between.
 * Do slow work (Gemini) BEFORE calling this, then apply the result inside fn.
 */
export async function updateJob(id: string, fn: (job: Job) => Job): Promise<Job> {
  const current = tables().jobs.get(id);
  if (!current) throw new Error(`No job ${id}`);
  return saveJob(fn(current));
}

export const isOpen = (j: Job) => j.status !== "done" && j.status !== "stopped";

/** The worker's open job, newest first. This is how a dropped call resumes at the same step. */
export async function findOpenJob(workerId: string): Promise<Job | null> {
  const open = [...tables().jobs.values()]
    .filter((j) => j.workerId === workerId && isOpen(j))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return open[0] ?? null;
}

export async function listJobs(workerId: string): Promise<Job[]> {
  return [...tables().jobs.values()]
    .filter((j) => j.workerId === workerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

/** Wipes everything and re-seeds the demo worker and demo-2041. */
export async function resetDemo(): Promise<void> {
  resetTables();
}
