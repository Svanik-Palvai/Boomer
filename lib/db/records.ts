// OWNER: Zohaib (backend). Work record entries, one per finished job.
import type { RecordEntry } from "@/lib/types";
import { backend } from "./backend";
import { ready } from "./memoryStore";

export async function saveRecordEntry(e: RecordEntry): Promise<RecordEntry> {
  await ready();
  await backend().put("record", e.id, e, { workerId: e.workerId, jobId: e.jobId });
  return e;
}

export async function getRecordEntryByJob(jobId: string): Promise<RecordEntry | null> {
  await ready();
  const [e] = await backend().list<RecordEntry>("record", { jobId });
  return e ?? null;
}

export async function listRecordEntries(workerId: string): Promise<RecordEntry[]> {
  await ready();
  return (await backend().list<RecordEntry>("record", { workerId })).sort((a, b) => b.date.localeCompare(a.date));
}
