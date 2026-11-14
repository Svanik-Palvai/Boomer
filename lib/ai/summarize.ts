// OWNER: Sunny (AI)
import { callGemini, errorText, gemini, geminiEnabled, TEXT_MODEL } from "@/lib/ai/gemini";

/**
 * Voice call transcript -> one or two sentences for shared memory.
 * Keeps what changes the job (questions asked, conditions the worker described, answers given)
 * and drops small talk. Falls back to the first 300 characters if Gemini is off or fails.
 * /api/webhooks/voice calls this before remember().
 */
export async function summarizeCall(transcript: string): Promise<string> {
  const text = transcript.trim();
  if (!text) return "(empty call)";
  const fallback = text.length > 300 ? `${text.slice(0, 297)}...` : text;
  if (!geminiEnabled()) return fallback;

  try {
    const res = await callGemini(() =>
      gemini().models.generateContent({
        model: TEXT_MODEL,
        contents: `Summarize this phone call between an electrician on a job and the Boomer assistant in at most two short sentences.
Keep only what matters for the job: what the electrician asked or reported (conditions on site, problems), and what they were told.
Write it so another agent can act on it. No greetings or filler.

Call transcript:
"""${text.slice(0, 8000)}"""`,
        config: { temperature: 0 },
      }),
    );
    return res.text?.trim() || fallback;
  } catch (err) {
    console.error("[summarizeCall] Gemini failed, using truncated transcript:", errorText(err).slice(0, 200));
    return fallback;
  }
}

/**
 * Finished job -> one or two sentences for the record ("Swapped a counter receptacle for a GFCI in Princeton, NJ;
 * the wires were first landed on LOAD and moved to LINE."). Works without Gemini: a plain summary is built from
 * the step results, and Gemini only rewrites it when it is enabled. closeJob() treats undefined as "no summary".
 */
export async function summarizeJob(job: import("@/lib/types").Job): Promise<string | undefined> {
  const plain = plainJobSummary(job);
  if (!plain || !geminiEnabled()) return plain;
  try {
    const res = await callGemini(() =>
      gemini().models.generateContent({
        model: TEXT_MODEL,
        contents: `Rewrite these job facts as one or two plain sentences for an electrician's work record.
Keep every fact, add nothing. Never use the words safe, compliant, code-approved, passed or certified.

Facts: ${plain}`,
        config: { temperature: 0, maxOutputTokens: 120 },
      }),
    );
    const out = res.text?.trim();
    return out && !/\b(safe|compliant|code-approved|passed|certified)\b/i.test(out) ? out : plain;
  } catch (err) {
    console.error("[summarizeJob] Gemini failed, using plain summary:", errorText(err).slice(0, 200));
    return plain;
  }
}

/** Facts-only summary from the step results. */
export function plainJobSummary(job: import("@/lib/types").Job): string | undefined {
  if (!job.steps.length) return undefined;
  const where = job.site ? ` in ${job.site.city}, ${job.site.state}` : "";
  const done = job.results.filter((r) => r.status === "seen" || r.status === "worker_confirmed").length;
  const what = job.title ?? "Job";
  const parts = [`${what}${where}: ${done} of ${job.steps.length} steps done${job.status === "stopped" ? ", stopped early" : ""}.`];
  const corrected = job.steps.filter((_, i) => (job.results[i]?.fails ?? 0) > 0 && job.results[i]?.status === "seen");
  for (const s of corrected) parts.push(`Step ${s.order} was corrected after ${job.results[s.order - 1].fails} "not yet".`);
  const newHere = job.steps.filter((s) => s.tag === "new_here").length;
  if (newHere) parts.push(`${newHere} step${newHere === 1 ? " was" : "s were"} different from ${job.home.city}.`);
  return parts.join(" ");
}
