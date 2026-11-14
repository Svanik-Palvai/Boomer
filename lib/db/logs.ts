// OWNER: Zohaib (backend). Every voice tool call is logged; this is where the traction numbers come from.
import type { ToolLog } from "@/lib/types";
import { newId, nowIso, tables } from "./memoryStore";

export async function logToolCall(entry: Omit<ToolLog, "id" | "at">): Promise<void> {
  const log: ToolLog = { ...entry, id: newId("log"), at: nowIso() };
  tables().toolLogs.push(log);
  console.log(`[tool] ${log.tool} job=${log.jobId ?? "-"} ${log.ms}ms -> ${log.response.say}`);
}

export async function listToolLogs(jobId?: string): Promise<ToolLog[]> {
  return tables().toolLogs.filter((l) => !jobId || l.jobId === jobId);
}

/** "12 guided jobs, 61 steps checked, 9 mistakes caught" for the last slide. */
export async function tractionStats() {
  const logs = tables().toolLogs;
  const checks = logs.filter((l) => l.tool === "check_step");
  return {
    jobs: new Set(logs.map((l) => l.jobId).filter(Boolean)).size,
    stepsChecked: checks.length,
    mistakesCaught: checks.filter((l) => l.response.check?.outcome === "fail").length,
  };
}

/** Webhook dedup: true the first time a key is seen. */
export async function firstTimeSeen(key: string): Promise<boolean> {
  const seen = tables().seenEvents;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
