// OWNER: Teammate 3 (AI)
import type { Action, Case, Stage } from "@/lib/types";

/**
 * Free-text iMessage reply -> list of actions.
 * Rules that must always hold:
 *  - stage "local" can never produce "approve" (only confirm_plan / edits)
 *  - stage "manager" produces "approve" only on a plain yes
 *  - anything ambiguous -> "unclear"
 * TODO(T3): Gemini with a fixed JSON schema + these guardrails enforced in code.
 */
export async function parseReply(text: string, _c: Case, stage: Stage): Promise<Action[]> {
  const t = text.trim().toLowerCase();
  if (/^(yes|yep|yeah|approved?|ok|okay|looks (good|right))\b/.test(t)) {
    return [stage === "manager" ? { type: "approve" } : { type: "confirm_plan" }];
  }
  if (t.endsWith("?")) return [{ type: "question", text }];
  return [{ type: "unclear" }];
}
