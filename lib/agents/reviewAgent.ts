// OWNER: Sunny (AI + agents)
import type { Case, Stage } from "@/lib/types";
import { contextFor } from "@/lib/memory/store";
import { rules } from "@/lib/checks/runChecks";

/**
 * REVIEW AGENT (iMessage). Writes the short text that goes with each mini app card,
 * and the follow-ups when a reply is unclear or a question needs relaying.
 * Plain templates on purpose: instant, no Gemini quota, and the wording is reviewed by us.
 * Every message stays under ~300 characters so it reads on a lock screen.
 */
export async function cardIntro(c: Case, stage: Stage): Promise<string> {
  const newSteps = c.plan.filter((s) => s.tag === "new_here");
  const ruleIds = [...new Set(newSteps.map((s) => s.ruleId).filter(Boolean))];
  const topics = ruleIds.map((id) => rules.find((r) => r.id === id)?.topic).filter(Boolean);
  const why = topics.length ? ` because of ${topics.join(", ")}` : "";
  const place = `${c.job.site.city} ${c.job.site.state}`;

  if (stage === "local") {
    return clip(
      `[Case ${c.id}] ${cap(c.job.component)}, ${place} (NEC ${c.job.site.necEdition}). ` +
        `Worker usually works under NEC ${c.job.home.necEdition}. ${newSteps.length} step${newSteps.length === 1 ? "" : "s"} new here${why}. ` +
        `Is this how you'd do it? Tap the card or reply.`,
    );
  }

  const localSaid = (c.memory ?? []).filter((m) => m.speaker === "local_reviewer").map((m) => m.text);
  const change = localSaid.length ? ` They said: "${localSaid[localSaid.length - 1]}".` : "";
  return clip(`[Case ${c.id}] A local electrician reviewed the ${place} plan.${change} Approve? Tap the card or reply YES / NO.`);
}

/** Sent when parseReply returns "unclear". */
export function askToClarify(stage: Stage): string {
  return stage === "local"
    ? "Sorry, I didn't catch that. Reply YES if the plan is right, or tell me what to change."
    : "Sorry, I didn't catch that. Reply YES to approve, NO to hold, or tell me what you need.";
}

/** Sent to the local electrician when the worker asks something on a voice call. */
export function relayQuestion(c: Case, question: string): string {
  return clip(`[Case ${c.id}] The electrician on site asks: "${question}". Reply and I'll pass it on.`);
}

export async function reviewContext(c: Case): Promise<string> {
  return contextFor(c.id, "review");
}

function clip(s: string, n = 320): string {
  return s.length > n ? `${s.slice(0, n - 3)}...` : s;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
