// OWNER: Sunny (AI)
import { Type } from "@google/genai";
import type { Job } from "@/lib/types";
import { demoCase } from "@/lib/mock/demoCase";
import { callGemini, errorText, gemini, geminiEnabled, VISION_MODEL } from "@/lib/ai/gemini";

/**
 * Photo of the job (+ optional note from the worker) -> what the part is and what the task is.
 *
 * - Gemini vision reads the photo and answers in a fixed JSON shape.
 * - Component is picked from a fixed list, so later steps (checks, plan, rules) can match on it.
 * - Low confidence or "not electrical" sets needsRetake: the Snap screen should ask for a better photo.
 * - If Gemini errors or is off, it returns the demo job with source "fallback", so the demo never breaks.
 */

export const COMPONENTS = [
  "kitchen island receptacle",
  "kitchen countertop receptacle",
  "bathroom receptacle",
  "outdoor receptacle",
  "standard receptacle",
  "light switch",
  "light fixture",
  "breaker panel",
  "junction box",
  "other",
] as const;

export type JobIdentity = Pick<Job, "component" | "task" | "confidence"> & {
  details?: string; // what Gemini noticed, e.g. "two-prong, no GFCI, about 2 ft from the sink"
  needsRetake?: boolean;
  source: "gemini" | "fallback";
  error?: string;
};

const MIN_CONFIDENCE = 0.5;

export async function identifyJob(photo: string, note?: string): Promise<JobIdentity> {
  const demo = demoCase().job;
  const fallback = (error?: string): JobIdentity => ({
    component: demo.component,
    task: demo.task,
    confidence: demo.confidence,
    source: "fallback",
    error,
  });

  const image = parseImage(photo);
  if (!geminiEnabled() || !image) return fallback(image ? undefined : "no image received");

  try {
    const res = await callGemini(() =>
      gemini().models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.data } },
              {
                text: `You help an electrician document a job. Look at the photo${note ? ` and their note: "${note}"` : ""}.

A receptacle on a freestanding kitchen island or peninsula is "kitchen island receptacle".
Pick the component from this list: ${COMPONENTS.join(", ")}.
Write the task as a short phrase like "replace receptacle", "install new receptacle", "replace switch".
In "details", list what you can see that matters for code: number of prongs, GFCI test/reset buttons or not,
nearby sink or water, indoor or outdoor, box type. One sentence, only what is visible.
Set isElectrical to false if the photo is not an electrical device.
"confidence" is 0 to 1. Do not guess beyond what is visible.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              component: { type: Type.STRING, enum: [...COMPONENTS] },
              task: { type: Type.STRING },
              details: { type: Type.STRING },
              isElectrical: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
            },
            required: ["component", "task", "isElectrical", "confidence"],
          },
        },
      }),
    );

    const r = JSON.parse(res.text ?? "{}") as {
      component?: string;
      task?: string;
      details?: string;
      isElectrical?: boolean;
      confidence?: number;
    };
    const confidence = Math.max(0, Math.min(1, r.confidence ?? 0));
    const component = (COMPONENTS as readonly string[]).includes(r.component ?? "") ? r.component! : "other";

    return {
      component,
      task: r.task?.trim() || "inspect",
      confidence,
      details: r.details?.trim(),
      needsRetake: !r.isElectrical || confidence < MIN_CONFIDENCE || component === "other",
      source: "gemini",
    };
  } catch (err) {
    const msg = errorText(err).slice(0, 300);
    console.error("[identifyJob] Gemini failed, using demo job:", msg);
    return fallback(msg);
  }
}

/** Accepts a data URL ("data:image/jpeg;base64,...") or raw base64. */
function parseImage(photo: string): { mimeType: string; data: string } | null {
  if (!photo) return null;
  const m = photo.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) return { mimeType: m[1], data: m[2] };
  if (/^[A-Za-z0-9+/=\s]+$/.test(photo.slice(0, 200))) return { mimeType: "image/jpeg", data: photo };
  return null;
}
