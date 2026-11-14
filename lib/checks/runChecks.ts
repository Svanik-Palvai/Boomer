// OWNER: Teammate 4 (AR + location + checks data)
import type { Check, Job, Rule } from "@/lib/types";
import rulesData from "@/data/rules.json";
import { demoCase } from "@/lib/mock/demoCase";

export const rules = rulesData as Rule[];

/**
 * Job -> all checks (edition, amendments, differences, permit, inspection, license, parts, safety).
 * Only rules with verified: true may be shown as fact; everything else is "needs_review".
 * TODO(T4): build from rules.json and data/towns.json.
 */
export function runChecks(_job: Job): Check[] {
  return demoCase().checks;
}
