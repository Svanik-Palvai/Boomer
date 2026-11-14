// OWNER: Zohaib (backend). Ids, timestamps and the demo seed shared by lib/db/*.
import { backend } from "./backend";
import { DEMO_JOB_ID, DEMO_WORKER_ID, demoJob, demoWorker } from "@/lib/mock/demo";
import { normalizePhone } from "./phone";

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const nowIso = () => new Date().toISOString();

const g = globalThis as unknown as { __boomerSeeded?: Promise<void> };

/** Make sure the demo worker and demo-2041 exist. Runs once per process; every lib/db function awaits it. */
export function ready(): Promise<void> {
  return (g.__boomerSeeded ??= seed().catch((err) => {
    g.__boomerSeeded = undefined;
    throw err;
  }));
}

async function seed(force = false) {
  const b = backend();
  if (force || !(await b.get("worker", DEMO_WORKER_ID))) {
    const w = demoWorker();
    await b.put("worker", w.id, w, { phone: normalizePhone(w.phone) });
  }
  if (force || !(await b.get("job", DEMO_JOB_ID))) {
    const j = demoJob();
    await b.put("job", j.id, j, { workerId: j.workerId, jobId: j.id });
  }
}

/** Puts the demo worker and demo-2041 back to the start. Other workers, jobs and tool logs are kept. */
export async function reseedDemo(): Promise<void> {
  const b = backend();
  for (const r of await b.list<{ id: string }>("record", { jobId: DEMO_JOB_ID })) await b.del("record", r.id);
  await b.del("flag", `burst:${DEMO_JOB_ID}`);
  await b.pruneFrames(DEMO_JOB_ID, 0, []);
  await seed(true);
  g.__boomerSeeded = Promise.resolve();
}
