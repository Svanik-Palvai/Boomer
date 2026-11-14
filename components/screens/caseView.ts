import type { Case, PlanStep, Review, Stage } from "@/lib/types";

export function sortedPlan(c: Case): PlanStep[] {
  return [...c.plan].sort((a, b) => a.order - b.order);
}
export const newSteps = (c: Case) => sortedPlan(c).filter((p) => p.tag === "new_here");
export const standardSteps = (c: Case) => sortedPlan(c).filter((p) => p.tag !== "new_here");

export function review(c: Case, stage: Stage): Review | undefined {
  return c.reviews.find((r) => r.stage === stage);
}

/** "kitchen island receptacle, replace receptacle" -> "Kitchen island receptacle, replace receptacle" */
export function jobLine(c: Case) {
  const s = `${c.job.component}, ${c.job.task}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function place(c: Case) {
  return `${c.job.site.city}, ${c.job.site.state}`;
}

export function time(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const STATUS_WORDS: Record<Case["status"], string> = {
  new: "New",
  checks_done: "Checks done",
  with_local_reviewer: "With local electrician",
  plan_revised: "Plan revised",
  with_manager: "With manager",
  approved: "Manager approved",
  guiding: "Guiding",
  done: "Done",
  open_unverified: "Open, unverified",
};
export const statusWord = (c: Case) => STATUS_WORDS[c.status];

export const isApproved = (c: Case) => ["approved", "guiding", "done"].includes(c.status);

/** Which sentence describes a review decision, from the reviewer's side. */
export function decisionWords(r: Review | undefined, stage: Stage) {
  switch (r?.decision) {
    case "confirmed":
      return "Local electrician confirmed";
    case "approved":
      return "Manager approved";
    case "changes":
      return "Changes requested";
    case "rejected":
      return stage === "manager" ? "Manager asked for a change" : "Rejected";
    default:
      return "Waiting";
  }
}

export function addedBy(step: PlanStep) {
  if (step.addedBy === "local_reviewer") return "Added by local electrician";
  if (step.addedBy === "manager") return "Added by manager";
  return null;
}

/** Hostname for "Source: nfpa.org" style links. */
export function sourceHost(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
