// OWNER: Teammate 3 (agents) using Teammate 4's data
import { rules } from "@/lib/checks/runChecks";
import type { Rule } from "@/lib/types";

/**
 * CODE AGENT. Answers "what does the code say" questions for the other two agents,
 * only from verified rules with source links. Never invents a rule.
 * TODO(T3): match the question to rules with Gemini; return the rule + source.
 */
export async function lookupRule(question: string, state: string): Promise<Rule | null> {
  const q = question.toLowerCase();
  return (
    rules.find((r) => r.verified && r.jurisdiction === state && q.includes(r.topic.toLowerCase())) ?? null
  );
}
