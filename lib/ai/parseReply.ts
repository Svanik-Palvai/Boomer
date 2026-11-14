// OWNER: Sunny (AI)
import { GoogleGenAI, Type } from "@google/genai";
import type { Action, Case, Stage } from "@/lib/types";
import { USE_MOCKS } from "@/lib/config";

/**
 * Free-text iMessage reply -> list of actions the backend applies to the case.
 *
 * 1. Gemini reads the reply with the plan and returns JSON in a fixed shape.
 * 2. Code-level guardrails then override anything unsafe:
 *    - the local electrician can never approve (their "yes" becomes confirm_plan)
 *    - the manager only approves on a plain yes with no "but / wait / not"
 *    - remove_step must name a real step; add_step must have text
 *    - low confidence, contradictions, or nothing usable -> "unclear"
 * 3. If Gemini is off (mocks) or fails, a keyword parser runs instead.
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MIN_CONFIDENCE = 0.6;

const YES = /\b(yes|yep|yeah|yup|approved?|go ahead|send it|ok(ay)?|good to go|looks (good|right|fine)|lgtm|do it|confirmed?)\b/i;
const HEDGE = /\b(no|not|don'?t|wait|hold|but|unless|except|actually)\b|\?/i;

type RawAction = { type: string; text?: string; stepId?: string; reason?: string };
type RawResult = { actions: RawAction[]; confidence: number };

export type ParseResult = { actions: Action[]; source: "gemini" | "keyword"; error: string | null };
const GEMINI_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 2000;

export async function parseReply(text: string, c: Case, stage: Stage): Promise<Action[]> {
  return (await parseReplyDetailed(text, c, stage)).actions;
}

/** Same as parseReply, but also says which parser answered and why Gemini failed. */
export async function parseReplyDetailed(text: string, c: Case, stage: Stage): Promise<ParseResult> {
  const reply = text.trim();
  if (!reply) return { actions: [{ type: "unclear" }], source: "keyword", error: null };

  let raw: RawResult | null = null;
  let source: ParseResult["source"] = "keyword";
  let error: string | null = null;
  if (!USE_MOCKS && process.env.GEMINI_API_KEY) {
    try {
      raw = await withRetry(() => withTimeout(askGemini(reply, c, stage), GEMINI_TIMEOUT_MS));
      source = "gemini";
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 300) : String(err);
      console.error("[parseReply] Gemini failed, using keyword parser:", error);
    }
  }
  if (!raw) raw = keywordParse(reply);

  return { actions: guard(raw, reply, c, stage), source, error };
}

/** One retry on "overloaded" (503) or "too many requests" (429); anything else fails at once. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(msg)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return fn();
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Gemini timed out after ${ms}ms`)), ms)),
  ]);
}

async function askGemini(reply: string, c: Case, stage: Stage): Promise<RawResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const steps = c.plan.map((s) => `${s.id}: ${s.text}${s.tag === "new_here" ? " [new here]" : ""}`).join("\n");
  const who = stage === "local" ? "the local electrician reviewing the plan" : "the manager deciding whether to approve the job";

  const prompt = `You turn a text message from ${who} into actions on an electrical job plan.

Job: ${c.job.component}, ${c.job.task}, in ${c.job.site.city}, ${c.job.site.state}.
Plan steps (id: text):
${steps}

Their message: """${reply}"""

Action types:
- confirm_plan: they agree with the plan as is (local electrician only)
- approve: they plainly approve the job (manager only)
- add_step: they want a step added. Put the step in "text", written as a short instruction.
- remove_step: they want a step removed. Put its id in "stepId".
- reject: they say no or the plan is wrong. Put why in "reason" if given.
- question: they asked a question. Put the question in "text".
- unclear: you can't tell what they want.

A message can produce several actions, e.g. "looks good but add a tester check" is confirm_plan + add_step.
Never guess an approval. "confidence" is 0 to 1 for how sure you are overall.`;

  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          actions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  enum: ["confirm_plan", "approve", "add_step", "remove_step", "reject", "question", "unclear"],
                },
                text: { type: Type.STRING },
                stepId: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["type"],
            },
          },
          confidence: { type: Type.NUMBER },
        },
        required: ["actions", "confidence"],
      },
    },
  });

  const parsed = JSON.parse(res.text ?? "{}") as Partial<RawResult>;
  return { actions: parsed.actions ?? [], confidence: parsed.confidence ?? 0 };
}

/** Used when Gemini is off or errors. Handles the common short replies. */
export function keywordParse(reply: string): RawResult {
  const t = reply.toLowerCase();
  const actions: RawAction[] = [];

  const add = t.match(/\b(?:add|include|also)\b\s+(?:a |an |the )?(.+)/);
  if (YES.test(t) && !/\b(no|not|don'?t)\b/.test(t)) actions.push({ type: "approve" });
  if (add) actions.push({ type: "add_step", text: capitalize(add[1].replace(/[.!]+$/, "")) });
  if (/^(no|nope|nah)\b|\breject(ed)?\b|\bdon'?t approve\b/.test(t)) actions.push({ type: "reject" });
  if (t.includes("?")) actions.push({ type: "question", text: reply });

  return { actions, confidence: actions.length ? 0.7 : 0 };
}

/** Safety rules that hold no matter what the model said. */
function guard(raw: RawResult, reply: string, c: Case, stage: Stage): Action[] {
  if (raw.confidence < MIN_CONFIDENCE) return [{ type: "unclear" }];

  const out: Action[] = [];
  for (const a of raw.actions) {
    switch (a.type) {
      case "approve":
      case "confirm_plan":
        if (stage === "local") out.push({ type: "confirm_plan" });
        else if (YES.test(reply) && !HEDGE.test(reply)) out.push({ type: "approve" });
        break;
      case "add_step":
        if (a.text?.trim()) out.push({ type: "add_step", text: a.text.trim() });
        break;
      case "remove_step":
        if (a.stepId && c.plan.some((s) => s.id === a.stepId)) out.push({ type: "remove_step", stepId: a.stepId });
        break;
      case "reject":
        out.push({ type: "reject", reason: a.reason });
        break;
      case "question":
        out.push({ type: "question", text: a.text?.trim() || reply });
        break;
    }
  }

  const deduped = out.filter((a, i) => a.type === "add_step" || out.findIndex((b) => b.type === a.type) === i);
  const types = new Set(deduped.map((a) => a.type));
  if (types.has("approve") && types.has("reject")) return [{ type: "unclear" }];
  if (types.has("confirm_plan") && types.has("reject")) return [{ type: "unclear" }];
  return deduped.length ? deduped : [{ type: "unclear" }];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
