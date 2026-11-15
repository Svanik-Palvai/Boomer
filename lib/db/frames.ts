// OWNER: Zohaib (backend). Frames from the camera page.
import type { Frame, Job } from "@/lib/types";
import { FRAMES } from "@/lib/config";
import { backend } from "./backend";
import { newId, nowIso, ready } from "./memoryStore";

export async function addFrame(f: Omit<Frame, "id" | "at">): Promise<Frame> {
  await ready();
  const frame: Frame = { ...f, id: newId("frame"), at: nowIso() };
  const b = backend();
  await b.addFrame(frame);
  if (f.burst) await b.del("flag", `burst:${f.jobId}`);
  // Prune now and then. Frames a step result points at are kept for the record.
  if (Math.random() < 0.1) {
    const job = await b.get<Job>("job", f.jobId);
    const pinned = (job?.results ?? []).map((r) => r.frameId).filter((x): x is string => !!x);
    await b.pruneFrames(f.jobId, FRAMES.keepPerJob, pinned);
  }
  return frame;
}

/** Newest frames first, never older than maxAgeMs (default 10 s). Checks must only use these. */
export async function recentFrames(
  jobId: string,
  { maxAgeMs = FRAMES.maxAgeMs, limit = FRAMES.burst as number }: { maxAgeMs?: number; limit?: number } = {},
): Promise<Frame[]> {
  await ready();
  return backend().frames(jobId, { sinceMs: Date.now() - maxAgeMs, limit });
}

/** Newest frame regardless of age (live view only; never for checks). */
export async function latestFrame(jobId: string): Promise<Frame | null> {
  await ready();
  const [f] = await backend().frames(jobId, { limit: 1 });
  return f ?? null;
}

export async function getFrame(jobId: string, frameId: string): Promise<Frame | null> {
  await ready();
  return backend().frame(jobId, frameId);
}

/** The agent heard "done": ask the camera page for a burst of 3 on its next upload. */
export async function requestBurst(jobId: string): Promise<void> {
  await backend().put("flag", `burst:${jobId}`, true);
}

export async function burstWanted(jobId: string): Promise<boolean> {
  return !!(await backend().get("flag", `burst:${jobId}`));
}

/**
 * After requestBurst(): wait until the first burst frame lands (it clears the flag, see addFrame), so the check sees
 * the work as it is now, not a still from before "done". Gives up after waitMs and uses the newest frames it has.
 */
export async function framesAfterBurst(
  jobId: string,
  { waitMs = FRAMES.freshWaitMs as number, limit = FRAMES.checkFrames as number, pollMs = 150 } = {},
): Promise<Frame[]> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline && (await burstWanted(jobId))) await new Promise((r) => setTimeout(r, pollMs));
  return recentFrames(jobId, { limit });
}
