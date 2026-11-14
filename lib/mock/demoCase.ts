import type { Case, Check, Job } from "@/lib/types";
import { buildPlan } from "@/lib/ai/buildPlan";

/**
 * The one demo case everyone tests against (id: demo-2041).
 * Job: a Philadelphia electrician installing a kitchen ISLAND receptacle in Princeton, NJ,
 * because the verified rules in data/rules.json apply to island receptacles.
 * The plan is built by buildPlan() from data/rules.json, so verified rules show up here
 * automatically. Rule text and permit details come from Aniketh's data, not from this file.
 */
export const DEMO_CASE_ID = "demo-2041";

const JOB: Job = {
  id: "job-2041",
  component: "kitchen island receptacle",
  task: "install new receptacle",
  confidence: 0.9,
  home: {
    city: "Philadelphia",
    state: "PA",
    necEdition: "2020",
    sourceUrl: "https://www.phila.gov/departments/department-of-licenses-and-inspections/resources/applicable-codes/",
  },
  site: {
    city: "Princeton",
    state: "NJ",
    necEdition: "2023",
    sourceUrl: "https://www.nj.gov/dca/codes/codreg/current.shtml",
  },
  lat: 40.3431,
  lng: -74.6551,
};

const CHECKS: Check[] = [
  { id: "c1", type: "job_identity", title: "Job", result: "Kitchen island receptacle, new install", status: "found" },
  // GPS suggests the town; it only counts as found once the worker confirms it on the Checks screen
  { id: "c2", type: "location", title: "Location", result: "Princeton, NJ (tap to confirm)", status: "needs_review" },
  {
    id: "c3",
    type: "code_edition",
    title: "Code edition",
    result: "NJ: 2023 NEC. Home (Philadelphia): 2020 NEC",
    status: "found",
    sourceUrl: "https://www.nj.gov/dca/codes/codreg/current.shtml",
  },
  { id: "c4", type: "rule_difference", title: "Difference", result: "See rules for kitchen island receptacles", status: "needs_review" },
  { id: "c5", type: "permit", title: "Permit", result: "Permit office: from Aniketh's towns data", status: "needs_review" },
  { id: "c6", type: "license", title: "License", result: "Confirm your license covers NJ", status: "needs_review" },
];

export function demoCase(): Case {
  const now = new Date().toISOString();
  return {
    id: DEMO_CASE_ID,
    job: JOB,
    checks: CHECKS,
    plan: buildPlan(JOB, CHECKS),
    status: "checks_done",
    reviews: [
      { stage: "local", phone: "", decision: "pending" },
      { stage: "manager", phone: "", decision: "pending" },
    ],
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
