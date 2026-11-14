// OWNER: Sunny (AI)
import type { Case, PlaybookEntry } from "@/lib/types";

/**
 * The playbook: every approved job is saved so the next crew in that town finds it.
 * In-memory for now (seeded with one past job so search has something to show).
 * Zohaib: call savePlaybookEntry(c) when a case reaches "approved". Swap the Map for Supabase later.
 */
const g = globalThis as unknown as { __playbook?: Map<string, PlaybookEntry> };
const book =
  g.__playbook ??
  (g.__playbook = new Map([
    [
      "past-1987",
      {
        caseId: "past-1987",
        town: "Princeton",
        state: "NJ",
        jobType: "kitchen countertop receptacle",
        planSummary: "Replaced a countertop receptacle; local electrician added a tester check before close-up.",
        reviewers: ["local electrician", "manager"],
        date: "2026-11-02T15:00:00.000Z",
      },
    ],
  ]));

export function savePlaybookEntry(c: Case): PlaybookEntry {
  const newSteps = c.plan.filter((s) => s.tag === "new_here").map((s) => s.text.replace(/^Needs review:\s*/, ""));
  const changes = (c.memory ?? []).filter((m) => m.speaker === "local_reviewer" || m.speaker === "manager");
  const entry: PlaybookEntry = {
    caseId: c.id,
    town: c.job.site.city,
    state: c.job.site.state,
    jobType: c.job.component,
    planSummary: [
      `${c.job.task} (${c.job.site.state}, NEC ${c.job.site.necEdition}).`,
      newSteps.length ? `New here: ${newSteps.join("; ")}.` : "No steps different from home.",
      changes.length ? `Reviewers said: ${changes.map((m) => m.text).join(" / ")}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    reviewers: c.reviews.filter((r) => r.decision !== "pending").map((r) => (r.stage === "local" ? "local electrician" : "manager")),
    date: new Date().toISOString(),
  };
  book.set(c.id, entry);
  return entry;
}

/** Word-match search over town, state, job type and summary. Empty query returns everything, newest first. */
export async function searchPlaybook(query: string): Promise<PlaybookEntry[]> {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  const all = [...book.values()].sort((a, b) => b.date.localeCompare(a.date));
  if (!words.length) return all;
  return all
    .map((e) => {
      const hay = `${e.town} ${e.state} ${e.jobType} ${e.planSummary}`.toLowerCase();
      return { e, score: words.filter((w) => hay.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}
