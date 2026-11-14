// OWNER: Zohaib (Photon sign-up agent)
// A number Boomer doesn't know texts in: ask for name, home town and experience over a few texts, then create the worker.
// Gemini pulls whatever it can from each text (people often answer everything at once); a simple parser is the fallback.
import type { Experience, Jurisdiction } from "@/lib/types";
import { callGemini, errorText, gemini, geminiEnabled, TEXT_MODEL } from "@/lib/ai/gemini";
import { clearSignup, getSignup, saveSignup, saveWorker, type Signup } from "@/lib/db";
import { findTown, toJurisdiction } from "@/lib/location/towns";
import { absolute, pages } from "@/lib/routes";

const EXTRACT_BUDGET_MS = 5000;

const ASK = {
  name: "Hi, this is Boomer. I talk electricians through jobs on the phone, check each step on camera, and keep a record of your work. What's your name?",
  home: "Where are you based? City and state, like Philadelphia, PA.",
  experience: "Last one: are you a journeyman, or new out of trade school?",
} as const;

type Field = keyof typeof ASK;

/** Handles one text from an unknown number. Always returns the reply to send. */
export async function signupReply(phone: string, text: string): Promise<string> {
  const msg = text.trim();
  if (/^(stop|cancel|quit|unsubscribe)\b/i.test(msg)) {
    await clearSignup(phone);
    return "Okay, stopped. Text this number any time to set up Boomer.";
  }

  const existing = await getSignup(phone);
  const s: Signup = existing ?? { phone, startedAt: new Date().toISOString() };
  const asking = existing ? nextField(s) : null; // the question their text answers (none on the first text)

  Object.assign(s, withoutEmpty(await extract(msg, asking)));
  const missing = nextField(s);
  if (missing) {
    await saveSignup(s);
    // First text that told us nothing: introduce Boomer. Otherwise ask for the next missing thing.
    return !existing && missing === "name" ? ASK.name : ASK[missing];
  }

  const worker = await saveWorker({ phone, name: s.name!, home: home(s.city!, s.state!), experience: s.experience! });
  await clearSignup(phone);
  const n = process.env.PHOTON_NUMBER;
  return [
    `You're set up, ${worker.name.split(" ")[0]}. When you're on a job, strap your phone on and call Boomer${n ? ` at ${n}` : ""}.`,
    `Your work record will build here: ${absolute(pages.workRecord(worker.id))}`,
  ].join("\n");
}

function nextField(s: Signup): Field | null {
  if (!s.name) return "name";
  if (!s.city || !s.state) return "home";
  if (!s.experience) return "experience";
  return null;
}

/** Known towns get their adopted NEC edition; anywhere else is kept but marked for review. */
function home(city: string, state: string): Jurisdiction {
  const t = findTown(city, state);
  return t ? toJurisdiction(t) : { city: titleCase(city), state: state.toUpperCase(), necEdition: "needs review", sourceUrl: "" };
}

// ───────────────────────── Extraction ─────────────────────────

type Found = Partial<Pick<Signup, "name" | "city" | "state" | "experience">>;

async function extract(msg: string, asking: Field | null): Promise<Found> {
  if (geminiEnabled()) {
    try {
      const out = await Promise.race([geminiExtract(msg, asking), timeout(EXTRACT_BUDGET_MS)]);
      if (out) return out;
    } catch (err) {
      console.error("[signup] Gemini extract failed, using parser:", errorText(err).slice(0, 200));
    }
  }
  return parse(msg, asking);
}

async function geminiExtract(msg: string, asking: Field | null): Promise<Found | null> {
  const res = await callGemini(() =>
    gemini().models.generateContent({
      model: TEXT_MODEL,
      contents: `An electrician is signing up for Boomer by text. ${asking ? `We just asked: "${ASK[asking]}"` : "This is their first text."}
Pull out only what they actually said. Return JSON: {"name": string|null, "city": string|null, "state": two-letter US state|null, "experience": "journeyman"|"new"|null}.
"experience" is "new" for apprentices, students or anyone new out of trade school; "journeyman" for journeymen, masters, licensed or experienced electricians.
A greeting like "hi" or "hello" contains nothing. Never guess.
Their text: """${msg.slice(0, 500)}"""`,
      config: { temperature: 0, maxOutputTokens: 120, responseMimeType: "application/json" },
    }),
  );
  const j = JSON.parse(res.text ?? "{}") as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const state = str(j.state)?.toUpperCase();
  return {
    name: str(j.name) && cleanName(str(j.name)!),
    city: str(j.city),
    state: state && /^[A-Z]{2}$/.test(state) ? state : undefined,
    experience: j.experience === "new" || j.experience === "journeyman" ? (j.experience as Experience) : undefined,
  };
}

/** No-Gemini parser: reads the answer to the question we asked. */
function parse(msg: string, asking: Field | null): Found {
  const out: Found = { experience: experienceOf(msg) };
  // Details given in passing, in any text: "I'm Dana Lee", "out of Philadelphia PA".
  const named = msg.match(/\b(?:[Ii]['’]?m|[Ii] am|[Mm]y name is|[Mm]y name['’]s|[Tt]his is|[Nn]ame['’]s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (named && !/^(a|an|the|new|from|in|out|based|journeyman|apprentice)$/i.test(named[1].split(" ")[0])) out.name = cleanName(named[1]);
  const at = msg.match(/\b(?:in|from|out of|based in)\s+([A-Za-z .]+?),?\s+([A-Z]{2})\b/);
  if (at) Object.assign(out, place(`${at[1]}, ${at[2]}`));
  // The direct answer to what we asked.
  if (asking === "name" && !out.name) out.name = cleanName(msg);
  if (asking === "home" && !out.city) Object.assign(out, place(msg));
  return out;
}

function experienceOf(t: string): Experience | undefined {
  if (/\b(new|apprentice|student|trade school|first year|just (started|finished)|beginner)\b/i.test(t)) return "new";
  if (/\b(journey(wo)?man|journeyman|master|licensed|experienced|\d+\s*(years|yrs))\b/i.test(t)) return "journeyman";
  return undefined;
}

const STATES: Record<string, string> = {
  pennsylvania: "PA", "new jersey": "NJ", "new york": "NY", delaware: "DE", maryland: "MD", connecticut: "CT",
  massachusetts: "MA", ohio: "OH", virginia: "VA", california: "CA", texas: "TX", florida: "FL", illinois: "IL",
};

function place(msg: string): Found {
  const t = msg.replace(/^(i['’]?m |i am )?(based |living |located )?(in|out of|from)\s+/i, "").replace(/[.!]+$/, "").trim();
  const m = t.match(/^(.+?)[,\s]+([A-Za-z]{2}|[A-Za-z ]{4,})$/);
  if (!m) return {};
  const st = m[2].trim();
  const state = st.length === 2 ? st.toUpperCase() : STATES[st.toLowerCase()];
  return state ? { city: titleCase(m[1].trim()), state } : {};
}

function cleanName(s: string): string | undefined {
  const n = s.replace(/^(hi|hey|hello)[,!.\s]*/i, "").replace(/^(my name is|my name['’]s|i['’]?m|i am|it['’]s|this is|name:?)\s+/i, "").replace(/[.!]+$/, "").trim();
  if (!n || n.length > 40 || /\d/.test(n) || /^(hi|hey|hello|yo)$/i.test(n)) return undefined;
  return titleCase(n);
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function withoutEmpty(f: Found): Found {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Found;
}

function timeout(ms: number): Promise<null> {
  return new Promise((r) => setTimeout(() => r(null), ms));
}
