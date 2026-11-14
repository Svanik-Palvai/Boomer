// OWNER: Zohaib (backend)
/**
 * Process-wide in-memory tables, kept on globalThis so Next dev hot reloads don't wipe them.
 * Every lane goes through the functions in lib/db/*.ts, never through these maps, so the bodies
 * can move to Supabase (Postgres + Storage for frames) without anyone else changing code.
 * NOTE: one process only. On Vercel, instances don't share memory; move to Supabase before relying on it there.
 */
import type { Frame, Job, RecordEntry, ToolLog, Worker } from "@/lib/types";
import { demoJob, demoWorker } from "@/lib/mock/demo";

interface Tables {
  workers: Map<string, Worker>;
  jobs: Map<string, Job>;
  frames: Map<string, Frame[]>; // by jobId, oldest first
  records: Map<string, RecordEntry>;
  toolLogs: ToolLog[];
  burstWanted: Set<string>; // jobIds
  seenEvents: Set<string>; // webhook dedup keys
}

const g = globalThis as unknown as { __boomer?: Tables };

export function tables(): Tables {
  if (!g.__boomer) {
    g.__boomer = {
      workers: new Map(),
      jobs: new Map(),
      frames: new Map(),
      records: new Map(),
      toolLogs: [],
      burstWanted: new Set(),
      seenEvents: new Set(),
    };
    seed(g.__boomer);
  }
  return g.__boomer;
}

function seed(t: Tables) {
  const w = demoWorker();
  t.workers.set(w.id, w);
  const j = demoJob();
  t.jobs.set(j.id, j);
}

export function resetTables() {
  g.__boomer = undefined;
  return tables();
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const nowIso = () => new Date().toISOString();
