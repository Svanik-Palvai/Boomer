import type { Case } from "@/lib/types";

/**
 * The one demo case everyone tests against (id: demo-2041).
 * Rule content here is PLACEHOLDER until Teammate 4 verifies it.
 */
export const DEMO_CASE_ID = "demo-2041";

export function demoCase(): Case {
  const now = new Date().toISOString();
  return {
    id: DEMO_CASE_ID,
    job: {
      id: "job-2041",
      component: "kitchen countertop receptacle",
      task: "replace receptacle",
      confidence: 0.92,
      home: {
        city: "Philadelphia",
        state: "PA",
        necEdition: "2020",
        sourceUrl:
          "https://www.phila.gov/departments/department-of-licenses-and-inspections/resources/applicable-codes/",
      },
      site: {
        city: "Princeton",
        state: "NJ",
        necEdition: "2023",
        sourceUrl: "https://www.nj.gov/dca/codes/codreg/current.shtml",
      },
      lat: 40.3431,
      lng: -74.6551,
    },
    checks: [
      { id: "c1", type: "job_identity", title: "Job", result: "Kitchen countertop receptacle, replacement", status: "found" },
      { id: "c2", type: "location", title: "Location", result: "Princeton, NJ", status: "found" },
      {
        id: "c3",
        type: "code_edition",
        title: "Code edition",
        result: "NJ: 2023 NEC. Home (Philadelphia): 2020 NEC",
        status: "found",
        sourceUrl: "https://www.nj.gov/dca/codes/codreg/current.shtml",
      },
      { id: "c4", type: "rule_difference", title: "Difference", result: "PLACEHOLDER rule difference", status: "needs_review", ruleId: "placeholder-1" },
      { id: "c5", type: "permit", title: "Permit", result: "PLACEHOLDER permit office", status: "needs_review" },
      { id: "c6", type: "license", title: "License", result: "Confirm your license covers NJ", status: "needs_review" },
    ],
    plan: [
      { id: "s1", order: 1, text: "Turn off the breaker and verify the circuit is dead", tag: "standard", addedBy: "plan" },
      { id: "s2", order: 2, text: "Remove the old receptacle", tag: "standard", addedBy: "plan" },
      { id: "s3", order: 3, text: "PLACEHOLDER new step from rule difference", tag: "new_here", ruleId: "placeholder-1", arStepId: "ar-1", addedBy: "plan" },
      { id: "s4", order: 4, text: "PLACEHOLDER second new step", tag: "new_here", ruleId: "placeholder-1", arStepId: "ar-2", addedBy: "plan" },
      { id: "s5", order: 5, text: "Mount the receptacle and cover plate", tag: "standard", addedBy: "plan" },
      { id: "s6", order: 6, text: "Restore power and test", tag: "standard", addedBy: "plan" },
    ],
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
