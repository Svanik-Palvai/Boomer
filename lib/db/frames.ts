// OWNER: Zohaib (backend). Frames from the camera page.
import type { Frame, Job } from "@/lib/types";
import { FRAMES } from "@/lib/config";
import { backend } from "./backend";
import { newId, nowIso, ready } from "./memoryStore";

/** Slack for server instances whose clocks differ a little: a frame must be this much newer than the request to count. */
const CLOCK_MARGIN_MS = 150;

/**
 * Store a frame. `takenAt` is the phone's server-clock estimate of when it was taken (see FrameUpload.takenAt).
 * While a check is waiting (requestBurst), the first frame that is provably from after the request answers it:
 * a burst frame (taken after the phone heard the request), or any frame whose takenAt is after the request.
 */
export async function addFrame(f: Omit<Frame, "id" | "at">, takenAt?: number): Promise<Frame> {
  await ready();
  const frame: Frame = { ...f, id: newId("frame"), at: nowIso() };
  const b = backend();
  await b.addFrame(frame);
  const asked = await b.get<number | boolean>("flag", `burst:${f.jobId}`);
  const fresh = f.burst || (typeof asked === "number" && takenAt !== undefined && takenAt >= asked + CLOCK_MARGIN_MS);
  if (asked && fresh) {
    // Frames land in the order they're taken (the phone uploads one at a time), so this one and any after it are fresh.
    await b.put("flag", `fresh:${f.jobId}`, frame.at);
    await b.del("flag", `burst:${f.jobId}`);
  }
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

/** The agent heard "done": ask the camera page for a burst of 3 on its next upload. The flag holds when it asked. */
export async function requestBurst(jobId: string): Promise<void> {
  await Promise.all([backend().del("flag", `fresh:${jobId}`), backend().put("flag", `burst:${jobId}`, Date.now())]);
}

export async function burstWanted(jobId: string): Promise<boolean> {
  return !!(await backend().get("flag", `burst:${jobId}`));
}

/**
 * After requestBurst(): wait until a frame taken after the request lands (it clears the flag, see addFrame), so the
 * check sees the work as it is now, not a still from before "done". Returns only frames from that one on.
 * Gives up after waitMs and uses the newest frames it has.
 * Landing after the request isn't enough: on slow Wi-Fi a still taken before "done" can land after it
 * (lib/db/frames.sim.ts measures this), so freshness comes from the burst or the phone's takenAt.
 */
export async function framesAfterBurst(
  jobId: string,
  { waitMs = FRAMES.freshWaitMs as number, limit = FRAMES.checkFrames as number, pollMs = 100 } = {},
): Promise<Frame[]> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline && (await burstWanted(jobId))) await new Promise((r) => setTimeout(r, pollMs));
  const freshAt = await backend().get<string>("flag", `fresh:${jobId}`);
  if (freshAt) {
    const fresh = await backend().frames(jobId, { sinceMs: Date.parse(freshAt), limit });
    if (fresh.length) return fresh;
  }
  return recentFrames(jobId, { limit });
}
