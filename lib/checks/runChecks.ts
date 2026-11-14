import type { Check, Job, Rule } from "@/lib/types";
import rulesData from "@/data/rules.json";
import towns from "@/data/towns.json";
export const rules = rulesData as Rule[];
export function runChecks(job: Job): Check[] {
  const town = towns.find(
    (t) =>
      t.city.toLowerCase() === job.site.city.toLowerCase() &&
      t.state === job.site.state,
  );
  const home = towns.find(
    (t) =>
      t.city.toLowerCase() === job.home.city.toLowerCase() &&
      t.state === job.home.state,
  );
  const checks: Check[] = [];
  const add = (
    type: Check["type"],
    title: string,
    result: string,
    sourceUrl?: string,
    status: Check["status"] = "needs_review",
    ruleId?: string,
  ) =>
    checks.push({
      id: `${type}-${checks.length}`,
      type,
      title,
      result,
      sourceUrl,
      status,
      ruleId,
    });
  add(
    "job_identity",
    "Photo interpretation",
    `${job.component}: ${job.task}. Confirm the task and existing conditions.`,
  );
  add(
    "location",
    "Confirm location",
    `${job.site.city}, ${job.site.state}. Worker confirmation required.`,
    "https://www.openstreetmap.org/copyright",
  );
  add(
    "code_edition",
    "Site edition",
    town
      ? `${town.necEdition} NEC listed. ${town.editionCaveat}`
      : "Edition not researched for this town.",
    town?.sourceUrl,
  );
  add(
    "code_edition",
    "Home edition",
    home
      ? `${home.city}: ${home.necEdition} NEC listed. ${home.editionCaveat}`
      : "Home edition needs review.",
    home?.sourceUrl,
  );
  add(
    "local_amendments",
    "Amendments / existing work",
    "No project-specific amendment determination made. Confirm state amendments, existing-building provisions and elected edition with the official.",
    town?.sourceUrl,
  );
  const matched = rules.filter(
    (r) =>
      r.jurisdiction === job.site.state &&
      r.edition === town?.necEdition &&
      home?.necEdition === "2020" &&
      r.appliesTo.includes(job.component.toLowerCase().trim()),
  );
  for (const r of matched)
    add(
      "rule_difference",
      r.topic,
      r.verified
        ? `${r.summary} ${r.caveat}`
        : "Unverified candidate: needs review.",
      r.sourceUrl,
      r.verified ? "found" : "needs_review",
      r.verified ? r.id : undefined,
    );
  if (!matched.length)
    add(
      "rule_difference",
      "No verified task-specific difference",
      "An edition change alone does not establish a new installation step. Countertop GFCI protection is not new solely because of the 2023 edition.",
      town?.sourceUrl,
    );
  add(
    "permit",
    town?.permitOffice || "Permit office",
    town?.permitNote || "Permit requirements not researched.",
    town?.permitUrl,
  );
  if (town)
    add(
      "permit",
      "Maintenance exception",
      "Confirm whether this replacement qualifies for the maintenance exception; it is not a blanket exemption for altered wiring.",
      town.maintenanceUrl,
    );
  add(
    "inspection",
    "Inspection",
    town?.inspection || "Inspection stages need review.",
    town?.inspectionUrl,
  );
  add(
    "license",
    "License — confirm",
    town?.licenseNote || "License requirements need review.",
    town?.licenseUrl,
  );
  add(
    "parts",
    "Parts",
    "No automatic purchase list. Reviewer must specify device ratings, protection and suitability after confirming scope.",
    town?.sourceUrl,
  );
  add(
    "safety",
    "Always shown",
    "De-energize and verify absence of voltage using your established procedure. Demo props must remain inert.",
    town?.sourceUrl,
  );
  return checks;
}
