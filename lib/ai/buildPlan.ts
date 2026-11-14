// OWNER: Teammate 3 (AI)
import type { Check, Job, PlanStep } from "@/lib/types";
import { demoCase } from "@/lib/mock/demoCase";

/**
 * Job + checks -> ordered plan, each step tagged "standard" or "new_here".
 * TODO(T3): standard steps from a template per job type,
 * plus inserted steps from each matched Rule.addsSteps.
 */
export function buildPlan(_job: Job, _checks: Check[]): PlanStep[] {
  return demoCase().plan;
}
