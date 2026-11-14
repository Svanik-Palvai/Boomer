// OWNER: Zohaib (Photon recorder agent)
// The iMessage side of Boomer. Reads the shared job memory (contextFor) before it answers a text.
// It answers questions about the job so far; it never gives new electrical instructions over text.
import type { Job, MemoryEvent, Worker } from "@/lib/types";
import { BANNED_WORDS } from "@/lib/copy";
import { callGemini, errorText, gemini, geminiEnabled, TEXT_MODEL } from "@/lib/ai/gemini";
import { contextFor } from "@/lib/memory/store";
import { absolute, pages } from "@/lib/routes";

/** The webhook must answer well under 10 s, so the model gets this long before we fall back. */
const REPLY_BUDGET_MS = 6000;
const MAX_REPLY_CHARS = 480;

/** Texts that need no answer: acks, thanks, emoji. */
const NO_REPLY =
  /^(ok(ay)?|k|kk|cool|got it|thanks?|thank you|thx|ty|great|nice|sounds good|will do|yes|yep|yeah|no|nope|bye|see ya|👍|🙏)[\s.!]*$/i;

export async function recorderReply(job: Job, worker: Worker, text: string): Promise<string | null> {
  const msg = text.trim();
  if (needsNoReply(msg)) return null;

  const links = recordLinks(job, worker);
  const fallback = () => guard(fallbackReply(job, msg, links));
  if (!geminiEnabled()) return fallback();

  try {
    const out = await withBudget(geminiReply(job, worker, msg, links), REPLY_BUDGET_MS);
    if (out === null) return null;
    const clean = tidy(out);
    if (!clean || hasBanned(clean)) return fallback(); // reject, don't ship banned wording
    return clean;
  } catch (err) {
    console.error("[recorderReply] Gemini failed, using fallback:", errorText(err).slice(0, 200));
    return fallback();
  }
}

// ───────────────────────── Gemini path ─────────────────────────

async function geminiReply(job: Job, worker: Worker, msg: string, links: Links): Promise<string | null> {
  const res = await callGemini(() =>
    gemini().models.generateContent({
      model: TEXT_MODEL,
      contents: `You are Boomer's text-message assistant. An electrician texted the number below. Reply like an iMessage: 1-3 short sentences, plain text, no markdown, no bullet points, no emoji.

Rules:
- Answer ONLY from the job context below (steps, what the camera check said, what was said on calls and texts). If the context does not say, say you don't have that.
- Typical questions: what step they were on, what the check said, sending their record, what was different at this site (steps marked [NEW HERE]).
- Never give new electrical instructions or how-to over text. For that, tell them to call Boomer${phoneHint()} and it will guide them.
- Never invent steps, readings or results.
- Never use these words: ${BANNED_WORDS.join(", ")}. Say "looks right" or "observed" instead.
- Describe a camera check only as "Looks right", "Not yet" or "Can't tell", never "failed" or "pass".
- If they ask for their record, include this link: ${links.work}${links.job ? `\n- This job's record: ${links.job}` : ""}
- If the text needs no reply at all (just "ok", thanks, an emoji), output exactly: NO_REPLY

Job context:
"""${contextFor(job, worker)}"""

Latest check results (from the checker):
${checkerEvents(job).slice(-3).map((e) => `- ${e.text}`).join("\n") || "- none yet"}

Their text: """${msg.slice(0, 1000)}"""`,
      config: { temperature: 0.2, maxOutputTokens: 200 },
    }),
  );
  const out = res.text?.trim() ?? "";
  if (/^NO_REPLY\b/.test(out)) return null;
  return out;
}

// ───────────────────────── Fallback (no Gemini) ─────────────────────────

function fallbackReply(job: Job, msg: string, links: Links): string {
  const t = msg.toLowerCase();
  const recordLine = links.job ? `This job's record: ${links.job}` : `Your work record: ${links.work}`;

  if (/\brecords?\b|\breport\b|\bproof\b/.test(t)) {
    return links.job
      ? `This job's record: ${links.job}\nYour full work record: ${links.work}`
      : `Your Boomer work record: ${links.work}`;
  }

  if (/\bcheck(ed|s)?\b|\bcamera\b|\bsee\b|\blook(ed)?\b/.test(t)) {
    const last = checkerEvents(job).at(-1);
    if (last) return `Last camera check (${timeAgo(last.at)}): ${last.text}`;
    return "No camera checks on this job yet.";
  }

  if (/\bdifferent\b|\bnew here\b|\bchanged?\b|\bcode\b/.test(t)) {
    const diff = job.steps.filter((s) => s.tag === "new_here");
    if (!diff.length) return "Nothing on this job was marked different from your home town.";
    return `Different here: ${diff.map((s) => `step ${s.order}, ${s.text}`).join("; ")}`;
  }

  if (/\bstep\b|\bwhere\b|\bwhat was i on\b|\bup to\b|\bnext\b|\bprogress\b/.test(t)) {
    if (!job.steps.length) return `No plan on this job yet. Call Boomer${phoneHint()} to get started.`;
    if (job.status === "done" || job.current >= job.steps.length) {
      return `All ${job.steps.length} steps are done on this job. ${recordLine}`;
    }
    if (job.status === "stopped") {
      const step = job.steps[job.current];
      return `This job was stopped at step ${step.order} of ${job.steps.length}: ${step.text}`;
    }
    const step = job.steps[job.current];
    return `You're on step ${step.order} of ${job.steps.length}: ${step.text} Call Boomer${phoneHint()} to keep going.`;
  }

  return `Boomer guides the job by phone. Call${phoneHint(true)} to keep going. ${recordLine}`;
}

// ───────────────────────── Helpers ─────────────────────────

interface Links {
  work: string;
  job?: string;
}

function recordLinks(job: Job, worker: Worker): Links {
  return {
    work: absolute(pages.workRecord(worker.id)),
    job: job.status === "done" || job.status === "stopped" ? absolute(pages.jobRecord(job.id)) : undefined,
  };
}

function checkerEvents(job: Job): MemoryEvent[] {
  return job.memory.filter((m) => m.agent === "checker");
}

function phoneHint(bare = false): string {
  const n = process.env.PHOTON_NUMBER;
  if (n) return bare ? ` ${n}` : ` at ${n}`;
  return bare ? " this number" : "";
}

function needsNoReply(msg: string): boolean {
  if (!msg) return true;
  if (NO_REPLY.test(msg)) return true;
  // Emoji / punctuation only.
  return !/[\p{L}\p{N}]/u.test(msg);
}

const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.map((w) => w.replace(/-/g, "\\-")).join("|")})\\b`, "gi");
const REWRITE: Record<string, string> = {
  safe: "ready",
  compliant: "matching the source",
  "code-approved": "matching the source",
  passed: "looked right",
  certified: "observed",
};

function hasBanned(s: string): boolean {
  BANNED_RE.lastIndex = 0;
  return BANNED_RE.test(s);
}

/** Rewrites any banned word (fallback text can quote step text or memory). */
export function guard(s: string): string {
  return s.replace(BANNED_RE, (w) => REWRITE[w.toLowerCase()] ?? "");
}

function tidy(s: string): string {
  const plain = s
    .replace(/\*\*|__|`|^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+\n/g, "\n")
    .trim();
  return plain.length > MAX_REPLY_CHARS ? `${plain.slice(0, MAX_REPLY_CHARS - 3)}...` : plain;
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

function withBudget<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`recorder reply over ${ms}ms`)), ms)),
  ]);
}
