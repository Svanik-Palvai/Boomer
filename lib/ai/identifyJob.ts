// OWNER: Teammate 3 (AI)
import type { Job } from "@/lib/types";
import { USE_MOCKS } from "@/lib/config";
import { demoCase } from "@/lib/mock/demoCase";

export type JobIdentity = Pick<Job, "component" | "task" | "confidence">;

/**
 * Photo (base64 or URL) + optional note -> what the part is and what the task is.
 * TODO(T3): Gemini vision call with a fixed JSON schema.
 * Must fall back to the demo job on error or low confidence.
 */
export async function identifyJob(_photo: string, _note?: string): Promise<JobIdentity> {
  const { component, task, confidence } = demoCase().job;
  if (USE_MOCKS) return { component, task, confidence };
  return { component, task, confidence };
}
