// OWNER: Sunny (AI). The step check: one yes/no question on fresh frames, answer in ~3 s.
import { Type } from "@google/genai";
import type { CheckResult, Frame, Step } from "@/lib/types";
import { callGemini, errorText, gemini, geminiEnabled, VISION_MODEL } from "@/lib/ai/gemini";
import { frameParts } from "@/lib/ai/frames";
import { SAY } from "@/lib/copy";

/**
 * Frames MUST already be fresh (< 10 s, see recentFrames()). Returns pass / fail / unclear and one line to say.
 * On any error it returns "unclear", never "pass".
 */
export async function checkStep(step: Step, frames: Frame[], attempt = 0): Promise<CheckResult> {
  const started = Date.now();
  const frameId = frames[0]?.id;
  if (frames.length === 0) return { outcome: "unclear", say: SAY.staleFrame };

  if (!geminiEnabled()) return { ...mockCheck(step, attempt), frameId, ms: Date.now() - started };

  try {
    const res = await callGemini(() =>
      gemini().models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              ...frameParts(frames),
              {
                text: `You check one step of an electrical job from a chest-mounted camera.
Question: ${step.check.question}
${step.check.expect ? `Looks right when: ${step.check.expect}` : ""}
Answer "pass" only if the photo clearly shows it. "fail" if it clearly shows something else. "unclear" if you can't see well enough.
"seen": what you see, under 15 words. "expected": what should be there, under 15 words.`,
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
              outcome: { type: Type.STRING, enum: ["pass", "fail", "unclear"] },
              seen: { type: Type.STRING },
              expected: { type: Type.STRING },
            },
            required: ["outcome"],
          },
        },
      }),
    );
    const r = JSON.parse(res.text ?? "{}") as { outcome?: CheckResult["outcome"]; seen?: string; expected?: string };
    const outcome = r.outcome === "pass" || r.outcome === "fail" ? r.outcome : "unclear";
    return { outcome, say: sayFor(outcome, r.seen, r.expected), seen: r.seen, expected: r.expected, frameId, ms: Date.now() - started };
  } catch (err) {
    console.error("[checkStep] Gemini failed:", errorText(err).slice(0, 200));
    return { outcome: "unclear", say: SAY.cantTell, frameId, ms: Date.now() - started };
  }
}

function sayFor(outcome: CheckResult["outcome"], seen?: string, expected?: string): string {
  if (outcome === "pass") return SAY.looksRight;
  if (outcome === "unclear") return SAY.cantTell;
  return [SAY.notYet, seen && `I see ${seen}.`, expected && `It should be ${expected}.`].filter(Boolean).join(" ");
}

/** Mock: the LINE/LOAD step fails on the first try so everyone can build against the caught mistake. */
function mockCheck(step: Step, attempt: number): Omit<CheckResult, "frameId" | "ms"> {
  if (step.id === "gfci-5-line" && attempt === 0) {
    return {
      outcome: "fail",
      say: "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE.",
      seen: "wires on the LOAD terminals",
      expected: "wires on the LINE terminals",
    };
  }
  return { outcome: "pass", say: SAY.looksRight };
}
