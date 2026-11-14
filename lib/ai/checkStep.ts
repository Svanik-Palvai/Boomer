// OWNER: Sunny (AI)
import { Type } from "@google/genai";
import type { CheckResult, Frame, GuideStep } from "@/lib/types";
import { errorText, gemini, geminiEnabled, VISION_MODEL } from "@/lib/ai/gemini";

/**
 * One step check on the newest frames. Answers within ~3 s or gives up as "unclear".
 *
 * - The model answers ONE yes/no question for the step (step.check.question).
 * - "unclear" is a real answer: blur, bad angle, part out of frame. It is never turned into a pass.
 * - On fail, `seen` says what is actually there so the agent can tell the worker what to fix.
 * - No frame, Gemini off, timeout or error -> "unclear", never "pass".
 *
 * Mock mode: a frame whose image starts with "mock:fail" fails, "mock:unclear" is unclear,
 * anything else passes. Lets the voice loop be tested without a camera.
 */

export interface StepCheck {
  result: CheckResult;
  say: string; // one line for the agent to speak
  seen?: string;
  frameAt?: string;
  source: "gemini" | "mock" | "no_frame" | "error";
  ms: number;
}

const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 6000);

export async function checkStep(step: GuideStep, frames: Frame[]): Promise<StepCheck> {
  const t0 = Date.now();
  const done = (r: Omit<StepCheck, "ms">): StepCheck => ({ ...r, ms: Date.now() - t0 });

  if (!frames.length) {
    return done({ result: "unclear", say: "I can't see the job right now. Point the camera at it and hold still.", source: "no_frame" });
  }
  const newest = frames[0];

  if (!geminiEnabled() || newest.image.startsWith("mock:")) {
    if (newest.image.startsWith("mock:fail")) {
      return done({ result: "fail", say: notYet(step, newest.image.slice(10) || "it doesn't match the step yet"), seen: newest.image.slice(10), frameAt: newest.at, source: "mock" });
    }
    if (newest.image.startsWith("mock:unclear")) {
      return done({ result: "unclear", say: CANT_TELL, frameAt: newest.at, source: "mock" });
    }
    return done({ result: "pass", say: "Looks right.", frameAt: newest.at, source: "mock" });
  }

  const images = frames.slice(0, 3).map(parseImage).filter(Boolean) as { mimeType: string; data: string }[];
  if (!images.length) return done({ result: "unclear", say: CANT_TELL, source: "no_frame" });

  try {
    const request = (noThinking: boolean) =>
      gemini().models.generateContent({
        model: VISION_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              ...images.map((img) => ({ inlineData: img })),
              { text: prompt(step) },
            ],
          },
        ],
        config: {
          temperature: 0,
          maxOutputTokens: 200,
          ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING, enum: ["yes", "no", "cant_tell"] },
              seen: { type: Type.STRING },
              fix: { type: Type.STRING },
            },
            required: ["answer", "seen"],
          },
        },
      });
    // Turning thinking off keeps checks under ~3 s. Some models reject that setting,
    // so on that specific error retry once with the model's default.
    let res;
    try {
      res = await withTimeout(request(true), CHECK_TIMEOUT_MS);
    } catch (err) {
      if (!/thinking/i.test(errorText(err))) throw err;
      res = await withTimeout(request(false), CHECK_TIMEOUT_MS);
    }
    const r = JSON.parse(res.text ?? "{}") as { answer?: string; seen?: string; fix?: string };
    const seen = r.seen?.trim();
    if (r.answer === "yes") return done({ result: "pass", say: "Looks right.", seen, frameAt: newest.at, source: "gemini" });
    if (r.answer === "no") {
      return done({ result: "fail", say: notYet(step, r.fix?.trim() || seen || "it doesn't match the step yet"), seen, frameAt: newest.at, source: "gemini" });
    }
    return done({ result: "unclear", say: CANT_TELL, seen, frameAt: newest.at, source: "gemini" });
  } catch (err) {
    console.error("[checkStep]", errorText(err).slice(0, 300));
    return done({ result: "unclear", say: CANT_TELL, source: "error" });
  }
}

const CANT_TELL = "I can't tell from here. Hold it closer and keep still.";

function notYet(step: GuideStep, what: string): string {
  const s = what.replace(/\.$/, "");
  return `Not yet. ${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

function prompt(step: GuideStep): string {
  return `You are checking one step of an electrician's job from a chest-mounted phone camera.
The newest image comes first. All demo props are de-energized.

Step the worker just finished: "${step.text}"
Question: ${step.check.question}

Answer "yes" only if the images clearly show it. Answer "no" if they clearly show something different.
Answer "cant_tell" if the part is blurry, too dark, cut off, or blocked. Never guess.
"seen": one short sentence on what is actually visible.
If the answer is "no", "fix": one short spoken sentence telling the worker what is wrong and what to do,
using the labels printed on the device (for example "Those are the LOAD terminals. Move both wires to the pair marked LINE.").
Never say safe, compliant, approved or passed.`;
}

function parseImage(f: Frame): { mimeType: string; data: string } | null {
  const m = f.image.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
  if (m) return { mimeType: m[1], data: m[2] };
  if (/^[A-Za-z0-9+/=]+$/.test(f.image.slice(0, 200))) return { mimeType: "image/jpeg", data: f.image };
  return null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`check timed out after ${ms}ms`)), ms))]);
}
