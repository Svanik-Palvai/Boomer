// OWNER: Sunny (AI)
import { Type } from "@google/genai";
import type { Frame, JobIdentity } from "@/lib/types";
import { callGemini, errorText, gemini, geminiEnabled, thinkingOffConfig, VISION_MODEL } from "@/lib/ai/gemini";
import { frameParts } from "@/lib/ai/frames";
import { jobTypes } from "@/lib/location/steps";
import { DEMO_JOB_TYPE } from "@/lib/mock/demo";

/**
 * Latest camera frames (+ what the worker said) -> what the part is, the likely problem, and which
 * pre-loaded job type matches. Falls back to the demo job so the demo never breaks.
 */
export const COMPONENTS = [
  "kitchen countertop receptacle",
  "kitchen island receptacle",
  "bathroom receptacle",
  "outdoor receptacle",
  "standard receptacle",
  "GFCI receptacle",
  "light switch",
  "light fixture",
  "breaker panel",
  "junction box",
  "other",
] as const;

/** No usable picture: go by what the worker said. Never claims to have seen anything. */
const fallback = (reason: "no_frame" | "model_error", error?: string): JobIdentity => ({
  component: "standard receptacle",
  problem: "an outlet to swap for a GFCI",
  jobType: DEMO_JOB_TYPE,
  confidence: 0.5,
  source: "fallback",
  fallbackReason: reason,
  ...(error && { fallbackError: error.slice(0, 300) }),
});

/**
 * The worker is standing there waiting while this runs, and ElevenLabs gives the look tool 10 s in all.
 * Thinking off (it's a pick-from-a-list question) keeps it to a second or two. The budget covers a retry after a
 * quick 503 and still leaves time to answer; before, a slow call plus its retry could run past the tool's limit.
 * A tighter 5 s cap was tried and cut off answers under API load (eval/identify.mts), so this stays at 8 s.
 */
const IDENTIFY_BUDGET_MS = Number(process.env.IDENTIFY_BUDGET_MS || 8000);

export async function identifyJob(frames: Frame[], note?: string): Promise<JobIdentity> {
  const parts = frameParts(frames.slice(0, 3));
  if (parts.length === 0) return fallback("no_frame");
  if (!geminiEnabled()) return fallback("model_error", "Gemini disabled (USE_MOCKS or no GEMINI_API_KEY)");

  const types = jobTypes();
  try {
    const res = await callGemini(() =>
      gemini().models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              ...parts,
              {
                text: `You help an electrician on a job. Look at the photos${note ? ` and what they said: "${note}"` : ""}.
Pick the component from: ${COMPONENTS.join(", ")}.
"problem" is a short phrase for what needs doing, from what is visible and what they said.
"jobType" is one of ${types.map((t) => `"${t.jobType}" (${t.title})`).join(", ")}, or "none".
"details": under 12 words, only what is visible. Do not guess beyond the photo. "confidence" is 0 to 1.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          maxOutputTokens: 300,
          thinkingConfig: thinkingOffConfig(VISION_MODEL),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              component: { type: Type.STRING, enum: [...COMPONENTS] },
              problem: { type: Type.STRING },
              jobType: { type: Type.STRING },
              details: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ["component", "problem", "jobType", "confidence"],
          },
        },
      }),
      { budgetMs: IDENTIFY_BUDGET_MS, retryDelayMs: 500 },
    );
    const r = JSON.parse(res.text ?? "{}") as Partial<Record<"component" | "problem" | "jobType" | "details", string>> & {
      confidence?: number;
    };
    return {
      component: r.component ?? "other",
      problem: r.problem?.trim() || "unknown",
      jobType: types.some((t) => t.jobType === r.jobType) ? r.jobType : undefined,
      details: r.details?.trim(),
      confidence: Math.max(0, Math.min(1, r.confidence ?? 0)),
      source: "gemini",
    };
  } catch (err) {
    console.error("[identifyJob] Gemini failed, using demo job:", errorText(err).slice(0, 200));
    return fallback("model_error", errorText(err));
  }
}
