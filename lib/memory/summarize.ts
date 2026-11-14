// OWNER: Sunny (AI + memory)
import { callGemini, errorText, gemini, geminiEnabled, TEXT_MODEL } from "@/lib/ai/gemini";

/**
 * Voice call transcript -> one or two sentences for shared memory.
 * Keeps what changes the job (questions asked, conditions the worker described, answers given)
 * and drops small talk. Falls back to the first 300 characters if Gemini is off or fails.
 * Zohaib's /api/webhooks/voice should call this before remember().
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
