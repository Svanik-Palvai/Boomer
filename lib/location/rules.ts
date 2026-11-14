// OWNER: Aniketh (location + data)
import type { Jurisdiction, Rule } from "@/lib/types";
import rulesData from "@/data/rules.json";
const allRules: Rule[] = rulesData;
const key = (s: string) => s.trim().toLowerCase();
const places = (j: Jurisdiction) => [
  key(j.state),
  key(`${j.city.trim()}, ${j.state.trim()}`),
];
/** Model-edition differences only. Site edition must match and home must differ. */
export function differencesFor(
  jobType: string,
  home: Jurisdiction,
  site: Jurisdiction,
): Rule[] {
  if (home.necEdition === site.necEdition || home.necEdition !== "2020")
    return [];
  const at = places(site),
    from = places(home);
  return allRules
    .filter(
      (r) =>
        r.edition === site.necEdition &&
        r.jobTypes.includes(jobType) &&
        at.includes(key(r.jurisdiction)) &&
        r.differsFrom.some((d) => from.includes(key(d))),
    )
    .map((r) => ({
      ...r,
      jobTypes: [...r.jobTypes],
      differsFrom: [...r.differsFrom],
      tagsSteps: [...r.tagsSteps],
    }));
}
export function ruleById(id: string): Rule | undefined {
  const r = allRules.find((r) => r.id === id);
  return r
    ? {
        ...r,
        jobTypes: [...r.jobTypes],
        differsFrom: [...r.differsFrom],
        tagsSteps: [...r.tagsSteps],
      }
    : undefined;
}
