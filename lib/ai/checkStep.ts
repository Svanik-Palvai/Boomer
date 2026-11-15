// OWNER: Sunny (AI). The step check: one yes/no question on fresh frames, answer in ~3 s.
import { Type } from "@google/genai";
import type { CheckOutcome, CheckResult, CheckVote, Frame, Step } from "@/lib/types";
import { errorText, gemini, geminiEnabled, thinkingOffConfig, VISION_MODEL } from "@/lib/ai/gemini";
import { frameParts } from "@/lib/ai/frames";
import { BANNED_WORDS, SAY } from "@/lib/copy";
import { FRAMES } from "@/lib/config";

/**
 * Frames MUST already be fresh (< 10 s, see recentFrames()). Returns pass / fail / unclear and one line to say.
 *
 * Panel of three reviewers, each a different Gemini model asked the same step question in parallel:
 *   - inspector  (VISION_MODEL): the general check, does the photo show the step done?
 *   - wiring     (CHECK_WIRING_MODEL): traces every wire to the screw it lands on and reads the printed labels
 *   - photo      (CHECK_PHOTO_MODEL): doubts the photo itself: right device, right side, lit, sharp, labels readable
 * Majority rules: "pass" only when at least 2 of 3 say pass; "fail" when at least 2 say fail; anything else
 * (a split, or reviewers that errored) is "unclear" and the worker is asked for a better look.
 * The check returns as soon as the result is settled (e.g. the first two agree): the last reviewer can't change it,
 * so its vote is left out of `votes`.
 * CHECK_PANEL=off goes back to the inspector alone.
 *
 * Kept fast when reviewers misbehave (the logs showed two of three out of quota, every check waiting 6 s on them):
 *   - a reviewer whose model is out of quota or not found sits out for REVIEWER_COOLDOWN_MS instead of being called again
 *   - once one reviewer has answered pass or fail, the others get CHECK_GRACE_MS more, then the check goes with what is in
 *   - the wiring reviewer only joins steps that are about wiring; on the others it could only ever say "unclear"
 * What the worker said about the step is passed to the reviewers as a pointer for where to look, never as proof.
 *
 * Per reviewer: thinking off for speed (one retry with the model default if it's rejected), hard cap of
 * CHECK_TIMEOUT_MS, any error or timeout is an "unclear" vote, never "pass". Banned words are scrubbed.
 */
const CHECK_TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS || 6000);
/** After the first pass/fail answer, how long the rest of the panel gets before the check goes with what it has. */
const CHECK_GRACE_MS = Number(process.env.CHECK_GRACE_MS || 1500);
/** A reviewer whose model is out of quota or missing is skipped for this long. */
const REVIEWER_COOLDOWN_MS = Number(process.env.REVIEWER_COOLDOWN_MS || 5 * 60_000);

/** model -> time until which it sits out. Per server instance, which is enough to stop paying for a dead model on every check. */
const benched = new Map<string, number>();
const isBenched = (model: string) => (benched.get(model) ?? 0) > Date.now();

/** What the check knows beyond the photo. */
export interface CheckContext {
  /** The worker's own words about the step ("both wires are on LINE"), if they said more than "done". */
  said?: string;
  /** Camera checks on this step that already came back "not yet" or "can't tell". */
  misses?: number;
}

/** Steps where wires land on terminals: the only ones the wiring reviewer can judge. */
const isWiringStep = (step: Step) => /line|load|terminat|wire/i.test(`${step.id} ${step.skill ?? ""}`) && !/terminal-id/.test(step.skill ?? "");

interface Reviewer {
  name: CheckVote["reviewer"];
  model: string;
  focus: string;
}

function panel(step: Step): Reviewer[] {
  const inspector: Reviewer = { name: "inspector", model: VISION_MODEL, focus: "" };
  if (process.env.CHECK_PANEL === "off") return [inspector];
  const all: Reviewer[] = [
    inspector,
    {
      name: "wiring",
      model: process.env.CHECK_WIRING_MODEL || "gemini-3.8-flash",
      focus: `You are the wiring checker. Ignore everything except conductors and terminals.
Trace each wire to the exact screw it is under and read the label printed beside that screw (LINE, LOAD, ground).
Check wire colors against screw colors (black on brass, white on silver, bare or green on the green screw).
One wire on the wrong screw is a "fail", even if everything else looks right. If you cannot follow a wire to its screw, "unclear".`,
    },
    {
      name: "photo",
      model: process.env.CHECK_PHOTO_MODEL || "gemini-3.5-flash",
      focus: `You are the photo skeptic. Before judging the work, doubt the photo.
Is it the right device and the right side of it for this step? Is the part the question is about lit, in focus and
fully in frame? Are the printed labels actually readable, not just assumed? If any of that is missing, answer "unclear".
Only when the photo truly shows it, answer the question.`,
    },
  ];
  const active = all.filter((r) => !isBenched(r.model) && (r.name !== "wiring" || isWiringStep(step)));
  // Never an empty panel: if every model is sitting out, try the inspector anyway.
  return active.length ? active : [inspector];
}

export async function checkStep(step: Step, frames: Frame[], attempt = 0, ctx: CheckContext = {}): Promise<CheckResult> {
  const started = Date.now();
  const frameId = frames[0]?.id;
  if (frames.length === 0) return { outcome: "unclear", say: SAY.staleFrame };

  if (!geminiEnabled()) return { ...mockCheck(step, attempt), frameId, ms: Date.now() - started };

  const parts = frameParts(frames.slice(0, FRAMES.checkFrames));
  if (parts.length === 0) return { outcome: "unclear", say: SAY.cantTell, frameId, ms: Date.now() - started };

  const reviewers = panel(step);
  const votes = await untilDecided(reviewers.map((r) => review(r, step, parts, ctx)), CHECK_GRACE_MS);
  const outcome = majority(votes, reviewers.length);
  // Speak the reasons of a reviewer that voted with the result (the inspector first).
  const lead = votes.find((v) => v.outcome === outcome) ?? votes[0];
  return {
    outcome,
    say: sayFor(outcome, lead.seen, lead.expected, lead.fix),
    seen: lead.seen,
    expected: lead.expected,
    frameId,
    ms: Date.now() - started,
    votes,
  };
}

/**
 * Decide from the reviewers that actually answered. Errors, timeouts and "can't tell" votes abstain: they never block
 * a step on their own. Among pass/fail votes the majority wins; a tie, or nobody answering, is "unclear".
 * So pass+unclear+unclear passes, fail+fail+pass (wires on LOAD) fails, pass+fail+unclear asks for a better look.
 * `total` = panel size, for callers that check whether outstanding votes could still change the result.
 */
export function majority(votes: Pick<CheckVote, "outcome" | "error">[], _total = votes.length): CheckOutcome {
  const answered = votes.filter((v) => !v.error);
  const p = answered.filter((v) => v.outcome === "pass").length;
  const f = answered.filter((v) => v.outcome === "fail").length;
  if (p > f) return "pass";
  if (f > p) return "fail";
  return "unclear";
}

/**
 * Resolves with the votes in so far once the outstanding votes can't change majority(): the pass/fail lead is bigger
 * than the number of votes still out (each could only add one to the other side). review() never rejects.
 * graceMs: once a reviewer has answered pass or fail, the others get this much longer; after that the check goes with
 * the votes that are in, so one slow or stuck reviewer can't hold every check to its timeout.
 */
export function untilDecided(pending: Promise<CheckVote>[], graceMs = Infinity): Promise<CheckVote[]> {
  const total = pending.length;
  return new Promise((resolve) => {
    const done: CheckVote[] = [];
    let grace: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (grace) clearTimeout(grace);
      resolve([...done]);
    };
    for (const p of pending)
      p.then((v) => {
        done.push(v);
        const left = total - done.length;
        const answered = done.filter((d) => !d.error);
        const lead = Math.abs(answered.filter((d) => d.outcome === "pass").length - answered.filter((d) => d.outcome === "fail").length);
        if (left === 0 || lead > left) return finish();
        if (!grace && Number.isFinite(graceMs) && !v.error && v.outcome !== "unclear") grace = setTimeout(finish, graceMs);
      });
  });
}

/** One short line per vote for the job memory, e.g. "inspector pass, wiring fail, photo error". */
export function voteSummary(votes: CheckVote[] = []): string {
  return votes.map((v) => `${v.reviewer} ${v.error ? `error: ${v.errorText ?? "unknown"}` : v.outcome}`).join(", ");
}

async function review(r: Reviewer, step: Step, parts: ReturnType<typeof frameParts>, ctx: CheckContext = {}): Promise<CheckVote> {
  const started = Date.now();
  const request = (thinkingOff: boolean) =>
    gemini().models.generateContent({
      model: r.model,
      contents: [{ role: "user", parts: [...parts, { text: prompt(step, r.focus, ctx) }] }],
      config: {
        temperature: 0,
        // Cap output only with thinking off; with the model's default thinking, the thoughts count toward the cap.
        ...(thinkingOff ? { maxOutputTokens: 400, thinkingConfig: thinkingOffConfig(r.model) } : {}),
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
      // Some models reject the thinking-off setting. Retry once with the model's defaults on any error, so a config
      // mismatch never turns every check into "can't tell". Not after a timeout: that would double the wait.
      // Nor when the model is out of quota or doesn't exist: the same request with other settings fails the same way.
      if (/timed out/.test(errorText(err)) || DEAD_MODEL.test(errorText(err))) throw err;
      console.error(`[checkStep] ${r.name} fast request failed, retrying with model defaults:`, errorText(err).slice(0, 300));
      res = await withTimeout(request(false), CHECK_TIMEOUT_MS);
    }
    const raw = (res.text ?? "").trim().replace(/^```(?:json)?|```$/g, "").trim();
    const j = JSON.parse(raw || "{}") as { outcome?: string; seen?: string; expected?: string; fix?: string };
    const outcome: CheckOutcome = j.outcome === "pass" || j.outcome === "fail" ? j.outcome : "unclear";
    return { reviewer: r.name, model: r.model, outcome, seen: scrub(j.seen), expected: scrub(j.expected), fix: scrub(j.fix), ms: Date.now() - started };
  } catch (err) {
    console.error(`[checkStep] ${r.name} (${r.model}) failed:`, errorText(err).slice(0, 200));
    const t = errorText(err);
    if (DEAD_MODEL.test(t)) benched.set(r.model, Date.now() + REVIEWER_COOLDOWN_MS);
    const short = /429|RESOURCE_EXHAUSTED|quota/i.test(t) ? "quota" : /timed out/i.test(t) ? "timed out" : /404|not found/i.test(t) ? "model not found" : t.slice(0, 60);
    return { reviewer: r.name, model: r.model, outcome: "unclear", error: true, errorText: short, ms: Date.now() - started };
  }
}

/** Errors that will repeat on the next call: no quota left, or no such model. */
const DEAD_MODEL = /\b(429|404)\b|RESOURCE_EXHAUSTED|quota|NOT_FOUND|not found/i;

/** Device facts the model kept getting wrong on the test set (it called a white wire on the silver LINE screw a mistake). */
const GFCI_FACTS = `GFCI facts:
- The LINE pair is one brass screw (hot, usually the black wire) and one silver screw (neutral, usually the white wire).
  A white wire on the silver LINE screw is correct. Both LINE screws should have a wire.
- LOAD is the other brass and silver pair, often under a sticker or tape. Any wire on a LOAD screw is wrong for this job.
- The bare or green wire goes on the green ground screw. It is not part of LINE or LOAD.
- A GFCI has TEST and RESET buttons on the front. A plain receptacle without them is not a GFCI.`;

function prompt(step: Step, focus = "", ctx: CheckContext = {}): string {
  const said = ctx.said?.replace(/["\n]/g, " ").trim().slice(0, 240);
  const context = [
    said &&
      `The worker says: "${said}". Use that only to know where to look. It is not proof, and it does not make a wrong photo right. ` +
        `But if the photo does not clearly contradict them, do not answer "fail".`,
    (ctx.misses ?? 0) >= 2 &&
      `This step has already been sent back ${ctx.misses} times. Look again from scratch. Answer "fail" only for something you can point to in this photo.`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${focus ? `${focus}\n\n` : ""}You check one step of an electrician's job from a chest-mounted phone camera. The newest photo comes first.
All props are de-energized. Step the worker just finished: "${step.text}"
Question: ${step.check.question}
${step.check.expect ? `Looks right when: ${step.check.expect}` : ""}
${/gfci/i.test(step.id + step.text) ? GFCI_FACTS : ""}
"pass": the photos clearly show what the question asks.
"fail": you can clearly see something wrong, like a wire on a LOAD terminal or the wrong side of the device. Say what is wrong.
"unclear": the part is too dark, blurry, cut off or blocked to judge. A bad photo is "unclear", never "fail". Never guess.
If the answer depends on a printed label (LINE, LOAD) and you cannot actually read that label in the photo, the answer is "unclear".
Do not work out which terminal is which from position or wire color alone.
${context}
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
