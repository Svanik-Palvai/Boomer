// OWNER: Aniketh (location + data)
import type { Jurisdiction, Rule } from "@/lib/types";
import rulesData from "@/data/rules.json";

const allRules = rulesData as Rule[];

const placeKeys = (j: Jurisdiction) => [j.state, `${j.city}, ${j.state}`].map((p) => p.toLowerCase());

/**
 * Rules that make this job different at the site compared with the worker's home.
 * A rule applies when it is for this job type, it is in force at the site (state or town),
 * and it lists the worker's home (state or town) in differsFrom.
 * Unverified rules are returned too; callers must check `verified` before stating them as fact.
 */
export function differencesFor(jobType: string, home: Jurisdiction, site: Jurisdiction): Rule[] {
  const at = new Set(placeKeys(site));
  const from = new Set(placeKeys(home));
  return allRules.filter(
    (r) =>
      r.jobTypes.includes(jobType) &&
      at.has(r.jurisdiction.toLowerCase()) &&
      r.differsFrom.some((d) => from.has(d.toLowerCase())),
  );
}

export function ruleById(id: string): Rule | undefined {
  return allRules.find((r) => r.id === id);
}
