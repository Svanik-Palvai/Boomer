// OWNER: Sunny (AI + agents), using Aniketh's rules data
import rulesData from "@/data/rules.json";
import type { Rule } from "@/lib/types";

const rules = rulesData as Rule[];

/**
 * CODE AGENT. Answers "what does the code say" for the other agents, only from rules.json.
 * Scores each rule for the job's place by how many question words appear in its topic,
 * section and summary. Never invents a rule: no match -> null, and the caller says it doesn't know.
 */
const STOP = new Set(["the", "a", "an", "is", "do", "i", "need", "does", "this", "that", "for", "in", "of", "to", "it", "what", "here", "my"]);

export function lookupRule(question: string, state: string, city?: string): { rule: Rule; answer: string } | null {
  const words = question.toLowerCase().split(/\W+/).filter((w) => w.length > 1 && !STOP.has(w));
  if (!words.length) return null;
  const places = new Set([state, city ? `${city}, ${state}` : ""].map((p) => p.toLowerCase()));

  const best = rules
    .filter((r) => places.has(r.jurisdiction.toLowerCase()))
    .map((r) => {
      const hay = `${r.topic} ${r.necSection} ${r.summary}`.toLowerCase();
      return { r, score: words.filter((w) => hay.includes(w)).length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return null;
  const r = best.r;
  const answer = r.verified
    ? `Source says (NEC ${r.edition} ${r.necSection}): ${r.summary}`
    : `Needs review: ${r.summary}. This rule hasn't been checked against the official text yet.`;
  return { rule: r, answer };
}
