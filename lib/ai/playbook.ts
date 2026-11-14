// OWNER: Teammate 3 (AI)
import type { PlaybookEntry } from "@/lib/types";

/** TODO(T3): query saved jobs (Z's database) by town and job type. */
export async function searchPlaybook(_query: string): Promise<PlaybookEntry[]> {
  return [
    {
      caseId: "demo-2041",
      town: "Princeton",
      state: "NJ",
      jobType: "kitchen countertop receptacle",
      planSummary: "PLACEHOLDER summary",
      reviewers: ["local electrician", "manager"],
      date: new Date().toISOString(),
    },
  ];
}
