// OWNER: Sunny (AI). Latest camera stills per job, kept in memory.
// Z's /api/frames route calls putFrame(); the checker reads latestFrame().
import type { Frame } from "@/lib/types";

/** A check never looks at a frame older than this, so a stale frame can't produce a pass. */
export const MAX_FRAME_AGE_MS = 10_000;
const KEEP = 6;

const g = globalThis as unknown as { __frames?: Map<string, Frame[]> };
const frames = g.__frames ?? (g.__frames = new Map<string, Frame[]>());

export function putFrame(caseId: string, image: string, at = new Date().toISOString()): Frame {
  const f: Frame = { caseId, image, at };
  const list = frames.get(caseId) ?? [];
  list.push(f);
  frames.set(caseId, list.slice(-KEEP));
  return f;
}

/** Newest frames first, only those younger than maxAgeMs. */
export function recentFrames(caseId: string, n = 3, maxAgeMs = MAX_FRAME_AGE_MS): Frame[] {
  const now = Date.now();
  return (frames.get(caseId) ?? [])
    .filter((f) => now - Date.parse(f.at) <= maxAgeMs)
    .slice(-n)
    .reverse();
}

export function latestFrame(caseId: string, maxAgeMs = MAX_FRAME_AGE_MS): Frame | null {
  return recentFrames(caseId, 1, maxAgeMs)[0] ?? null;
}

/** Any frame, even old, for the live job view. */
export function lastFrameAny(caseId: string): Frame | null {
  const list = frames.get(caseId) ?? [];
  return list[list.length - 1] ?? null;
}
