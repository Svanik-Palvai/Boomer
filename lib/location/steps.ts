// OWNER: Aniketh (data)
import type { JobTemplate } from "@/lib/types";
import stepsData from "@/data/steps.json";
import { z } from "zod";
const schema = z.array(
  z.object({
    jobType: z.string().min(1),
    title: z.string().min(1),
    component: z.string().min(1),
    steps: z
      .array(
        z.object({
          id: z.string().min(1),
          text: z.string().min(1),
          reason: z.string().min(1),
          shortText: z.string().optional(),
          hardGate: z.boolean().optional(),
          check: z.object({
            kind: z.enum(["spoken", "vision"]),
            question: z.string().min(1),
            expect: z.string().optional(),
            prompt: z.string().optional(),
          }),
        }),
      )
      .min(1),
  }),
);
const templates: JobTemplate[] = schema.parse(stepsData);
const ids = new Set<string>();
for (const t of templates) {
  if (ids.has(t.jobType)) throw new Error("Duplicate job type");
  ids.add(t.jobType);
  const steps = new Set<string>();
  for (const s of t.steps) {
    if (steps.has(s.id)) throw new Error("Duplicate step id");
    steps.add(s.id);
    if (s.hardGate && s.check.kind !== "spoken")
      throw new Error("Hard gates require spoken checks");
    if (s.check.kind === "vision" && !s.check.expect)
      throw new Error("Vision checks require expected evidence");
  }
}
export function jobTemplate(jobType: string): JobTemplate | undefined {
  const t = templates.find((t) => t.jobType === jobType);
  return t
    ? { ...t, steps: t.steps.map((s) => ({ ...s, check: { ...s.check } })) }
    : undefined;
}
export function jobTypes() {
  return templates.map(({ jobType, title, component }) => ({
    jobType,
    title,
    component,
  }));
}
/** Review metadata is separate from the shared runtime template contract. Never claim a review occurred. */
export function templateReview(jobType: string) {
  const t = stepsData.find((t) => t.jobType === jobType);
  return t
    ? {
        ...t.review,
        demoOnly: t.demoOnly,
        scope: t.scope,
        sourceUrl: t.sourceUrl,
      }
    : undefined;
}
