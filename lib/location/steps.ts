// OWNER: Aniketh (data). Loader for the hand-checked step lists in data/steps.json.
import type { JobTemplate } from "@/lib/types";
import stepsData from "@/data/steps.json";

const templates = stepsData as JobTemplate[];

export function jobTemplate(jobType: string): JobTemplate | undefined {
  return templates.find((t) => t.jobType === jobType);
}

export function jobTypes(): { jobType: string; title: string; component: string }[] {
  return templates.map(({ jobType, title, component }) => ({ jobType, title, component }));
}
