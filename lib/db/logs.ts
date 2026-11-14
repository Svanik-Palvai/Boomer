// OWNER: Zohaib (backend). Every voice tool call is logged; this is where the traction numbers come from.
import type { ToolLog } from "@/lib/types";
import { backend } from "./backend";
import { newId, nowIso, ready } from "./memoryStore";

export async function logToolCall(entry: Omit<ToolLog, "id" | "at">): Promise<void> {
  const log: ToolLog = { ...entry, id: newId("log"), at: nowIso() };
  console.log(`[tool] ${log.tool} job=${log.jobId ?? "-"} ${log.ms}ms -> ${log.response.say}`);
  try {
    await ready();
    await backend().put("toollog", log.id, log, { jobId: log.jobId });
  } catch (err) {
    console.error("[logToolCall] failed to store log:", err); // never fail a tool call over logging
  }
}

export async function listToolLogs(jobId?: string): Promise<ToolLog[]> {
  await ready();
  return (await backend().list<ToolLog>("toollog", jobId ? { jobId } : {})).sort((a, b) => a.at.localeCompare(b.at));
}

/** "12 guided jobs, 61 steps checked, 9 mistakes caught" for the last slide. */
export async function tractionStats() {
  const logs = await listToolLogs();
  const checks = logs.filter((l) => l.tool === "check_step");
  return {
    jobs: new Set(logs.map((l) => l.jobId).filter(Boolean)).size,
    stepsChecked: checks.length,
    mistakesCaught: checks.filter((l) => l.response.check?.outcome === "fail").length,
    calls: new Set(logs.map((l) => l.request.conversationId).filter(Boolean)).size,
  };
}

/** Webhook dedup: true the first time a key is seen. */
export async function firstTimeSeen(key: string): Promise<boolean> {
  await ready();
  return backend().claim("flag", `seen:${key}`);
}
