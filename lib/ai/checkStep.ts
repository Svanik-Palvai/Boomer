// OWNER: Sunny (AI). The step check: one yes/no question on fresh frames, answer in ~3 s.
import { Type } from "@google/genai";
import type { CheckResult, Frame, Step } from "@/lib/types";
import { errorText, gemini, geminiEnabled, VISION_MODEL } from "@/lib/ai/gemini";
import { frameParts } from "@/lib/ai/frames";
import { BANNED_WORDS, SAY } from "@/lib/copy";

/**
 * Frames MUST already be fresh (< 10 s, see recentFrames()). Returns pass / fail / unclear and one line to say.
 *
 * - One yes/no question per step (step.check.question), newest frame first, up to 3 frames.
 * - Thinking is turned off so the answer comes back inside the ~3 s budget. If the model rejects that
 *   setting, it retries once with the model's default.
 * - Hard cap of CHECK_TIMEOUT_MS: a slow answer becomes "unclear", never "pass".
 * - On "fail" the model writes one spoken fix line using the labels printed on the device
 *   ("Those are the LOAD terminals. Move both wires to the pair marked LINE.").
 * - Any error -> "unclear". Banned words are scrubbed from anything the model says.
 */
const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 6000);

export async function checkStep(step: Step, frames: Frame[], attempt = 0): Promise<CheckResult> {
  const started = Date.now();
  const frameId = frames[0]?.id;
  if (frames.length === 0) return { outcome: "unclear", say: SAY.staleFrame };

  if (!geminiEnabled()) return { ...mockCheck(step, attempt), frameId, ms: Date.now() - started };

  const parts = frameParts(frames.slice(0, 3));
  if (parts.length === 0) return { outcome: "unclear", say: SAY.cantTell, frameId, ms: Date.now() - started };

  const request = (thinkingOff: boolean) =>
    gemini().models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: "user", parts: [...parts, { text: prompt(step) }] }],
      config: {
        temperature: 0,
        ...(thinkingOff ? { maxOutputTokens: 400, thinkingConfig: { thinkingBudget: 0 } } : {}),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outcome: { type: Type.STRING, enum: ["pass", "fail", "unclear"] },
            seen: { type: Type.STRING },
            expected: { type: Type.STRING },
            fix: { type: Type.STRING },
          },
          required: ["outcome", "seen"],
        },
      },
    });

  try {
    let res;
    try {
      res = await withTimeout(request(true), CHECK_TIMEOUT_MS);
    } catch (err) {
      // Some models reject the thinking-off setting (Gemini 3 uses thinking levels). Retry once with
      // the model's defaults on ANY error, so a config mismatch never turns every check into "can't tell".
      console.error("[checkStep] fast request failed, retrying with model defaults:", errorText(err).slice(0, 300));
      res = await withTimeout(request(false), CHECK_TIMEOUT_MS);
    }
    const raw = (res.text ?? "").trim().replace(/^```(?:json)?|```$/g, "").trim();
    const r = JSON.parse(raw || "{}") as { outcome?: string; seen?: string; expected?: string; fix?: string };
    const outcome: CheckResult["outcome"] = r.outcome === "pass" || r.outcome === "fail" ? r.outcome : "unclear";
    const seen = scrub(r.seen);
    const expected = scrub(r.expected);
    return { outcome, say: sayFor(outcome, seen, expected, scrub(r.fix)), seen, expected, frameId, ms: Date.now() - started };
  } catch (err) {
    console.error("[checkStep] Gemini failed:", errorText(err).slice(0, 200));
    return { outcome: "unclear", say: SAY.cantTell, frameId, ms: Date.now() - started };
  }
}

function prompt(step: Step): string {
  return `You check one step of an electrician's job from a chest-mounted phone camera. The newest photo comes first.
All props are de-energized. Step the worker just finished: "${step.text}"
Question: ${step.check.question}
${step.check.expect ? `Looks right when: ${step.check.expect}` : ""}
Answer "pass" only if the photos clearly show it. "fail" if they clearly show something different.
"unclear" if the part is blurry, too dark, cut off or blocked. Never guess.
"seen": what is actually visible, under 15 words. "expected": what should be there, under 15 words.
If "fail", "fix": one short spoken sentence telling the worker what is wrong and what to do, using the labels
printed on the device, e.g. "Those are the LOAD terminals. Move both wires to the pair marked LINE."
Never use the words safe, compliant, code-approved, passed or certified.`;
}

function sayFor(outcome: CheckResult["outcome"], seen?: string, expected?: string, fix?: string): string {
  if (outcome === "pass") return SAY.looksRight;
  if (outcome === "unclear") return SAY.cantTell;
  if (fix) return `${SAY.notYet} ${fix}`;
  return [SAY.notYet, seen && `I see ${seen}.`, expected && `It should be ${expected}.`].filter(Boolean).join(" ");
}

/** Removes banned words from model text so they can never be spoken or shown. */
function scrub(s?: string): string | undefined {
  if (!s) return undefined;
  let out = s.trim();
  for (const w of BANNED_WORDS) out = out.replace(new RegExp(`\\b${w}\\b`, "gi"), "");
  return out.replace(/\s{2,}/g, " ").trim() || undefined;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`check timed out after ${ms}ms`)), ms))]);
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
