// OWNER: Sunny (AI + step engine)
import type { Jurisdiction, Step } from "@/lib/types";
import { jobTemplate } from "@/lib/location/steps";
import { differencesFor } from "@/lib/location/rules";

/**
 * Job type + home + site -> the step list for this job, each step tagged Standard or New here.
 *
 * Deterministic on purpose (no AI): the agent reads steps, it never invents them.
 * Steps come from data/steps.json (hand-checked); a step is "new_here" when a rule in data/rules.json
 * for this job type, in force at the site and different from home, lists it in tagsSteps.
 * Unverified rules still tag the step but set ruleVerified=false, so the UI and agent can say so.
 * Returns [] for a job type with no template.
 */
export function buildPlan(jobType: string, home: Jurisdiction, site?: Jurisdiction): Step[] {
  const template = jobTemplate(jobType);
  if (!template) return [];
  const rules = site ? differencesFor(jobType, home, site) : [];

  return template.steps.map((s, i) => {
    // Prefer a verified rule when several tag the same step.
    const rule = rules
      .filter((r) => r.tagsSteps.includes(s.id))
      .sort((a, b) => Number(b.verified) - Number(a.verified))[0];
    return {
      ...s,
      order: i + 1,
      tag: rule ? "new_here" : "standard",
      ...(rule && {
        ruleId: rule.id,
        necSection: rule.necSection,
        sourceUrl: rule.sourceUrl,
        ruleVerified: rule.verified,
      }),
    };
  });
}
