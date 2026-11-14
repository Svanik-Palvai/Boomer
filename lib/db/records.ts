// OWNER: Zohaib (backend). Work record entries, one per finished job.
import type { RecordEntry } from "@/lib/types";
import { tables } from "./memoryStore";

export async function saveRecordEntry(e: RecordEntry): Promise<RecordEntry> {
  tables().records.set(e.id, e);
  return e;
}

export async function getRecordEntryByJob(jobId: string): Promise<RecordEntry | null> {
  for (const e of tables().records.values()) if (e.jobId === jobId) return e;
  return null;
}

export async function listRecordEntries(workerId: string): Promise<RecordEntry[]> {
  return [...tables().records.values()]
    .filter((e) => e.workerId === workerId)
    .sort((a, b) => b.date.localeCompare(a.date));
}
