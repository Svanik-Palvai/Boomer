// OWNER: Zohaib (backend). Frames from the camera page.
import type { Frame } from "@/lib/types";
import { FRAMES } from "@/lib/config";
import { newId, nowIso, tables } from "./memoryStore";

export async function addFrame(f: Omit<Frame, "id" | "at">): Promise<Frame> {
  const frame: Frame = { ...f, id: newId("frame"), at: nowIso() };
  const t = tables();
  const list = t.frames.get(f.jobId) ?? [];
  list.push(frame);
  // Keep the newest N. Frames a step result points at are copied into the record when the job closes.
  if (list.length > FRAMES.keepPerJob) list.splice(0, list.length - FRAMES.keepPerJob);
  t.frames.set(f.jobId, list);
  if (f.burst) t.burstWanted.delete(f.jobId);
  return frame;
}

/** Newest frames first, never older than maxAgeMs (default 10 s). Checks must only use these. */
export async function recentFrames(jobId: string, { maxAgeMs = FRAMES.maxAgeMs, limit = FRAMES.burst } = {}): Promise<Frame[]> {
  const cutoff = Date.now() - maxAgeMs;
  return (tables().frames.get(jobId) ?? [])
    .filter((f) => Date.parse(f.at) >= cutoff)
    .reverse()
    .slice(0, limit);
}

/** Newest frame regardless of age (live view only; never for checks). */
export async function latestFrame(jobId: string): Promise<Frame | null> {
  const list = tables().frames.get(jobId) ?? [];
  return list[list.length - 1] ?? null;
}

export async function getFrame(jobId: string, frameId: string): Promise<Frame | null> {
  return (tables().frames.get(jobId) ?? []).find((f) => f.id === frameId) ?? null;
}

/** The agent heard "done": ask the camera page for a burst of 3 on its next upload. */
export async function requestBurst(jobId: string): Promise<void> {
  tables().burstWanted.add(jobId);
}

export async function burstWanted(jobId: string): Promise<boolean> {
  return tables().burstWanted.has(jobId);
}
