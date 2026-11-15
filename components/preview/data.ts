// Content for the /preview redesign. Every line here is traceable to the code path in `code`.
// Strings in quotes ("say", replies, step text) are copied from the implementation, not written for the page.
import steps from "@/data/steps.json";
import towns from "@/data/towns.json";
import { SAFETY_LINE } from "@/lib/copy";
import { FRAMES, UNCLEAR_RETRIES } from "@/lib/config";

export { SAFETY_LINE, FRAMES, UNCLEAR_RETRIES };

export type AgentId =
  | "guide"
  | "look"
  | "plan"
  | "checker"
  | "judge"
  | "recorder"
  | "share"
  | "signup"
  | "memory"
  | "lesson";

export type Kind = "agent" | "model" | "rules" | "store" | "pipeline";

export interface Agent {
  id: AgentId;
  name: string;
  kind: Kind;
  /** What it is, in the fewest words. */
  role: string;
  /** Tile line: five or six words. */
  short: string;
  runsOn: string;
  receives: string;
  produces: string;
  /** A real output, copied from the code (or the code's mock/fallback path). */
  sample: string;
  sampleLabel: string;
  code: string;
}

export const AGENTS: Agent[] = [
  {
    id: "guide",
    name: "Guide",
    kind: "agent",
    short: "Talks you through each step.",
    role: "Talks the electrician through the job, one step at a time.",
    runsOn: "ElevenLabs voice agent, reached on a Photon SIP number",
    receives: "Worker's speech · tool results from 10 server tools",
    produces: "One short spoken line, exactly the `say` its tool returned",
    sample: "Step 2. Test it dead and tell me the reading.",
    sampleLabel: "readStep(), step 2, journeyman profile",
    code: "lib/agent/prompt.ts · lib/agent/tools.ts",
  },
  {
    id: "look",
    name: "Look",
    kind: "model",
    short: "Names the job from the camera.",
    role: "Works out the job from the camera and the worker's words.",
    runsOn: "Gemini vision, called by the Guide's `look` tool",
    receives: "Up to 3 fresh frames · what the worker said",
    produces: "component · problem · jobType · confidence",
    sample: "No fresh picture: it goes by the worker's words and never claims to have seen anything.",
    sampleLabel: "identifyJob() fallback",
    code: "lib/ai/identifyJob.ts",
  },
  {
    id: "plan",
    name: "Plan",
    kind: "rules",
    short: "Builds steps from checked data.",
    role: "Builds the step list. Deterministic: the model never invents a step.",
    runsOn: "Plain TypeScript over hand-checked data",
    receives: "Job type · home town · job site",
    produces: "Ordered steps tagged Standard or New here, with hard gates",
    sample: "Unverified rules still tag the step, marked ruleVerified: false, and are never cited as a source.",
    sampleLabel: "buildPlan()",
    code: "lib/ai/buildPlan.ts · data/steps.json · data/rules.json",
  },
  {
    id: "checker",
    name: "Check panel",
    kind: "model",
    short: "Three models judge every step.",
    role: "Three reviewers judge each step from a fresh frame. Two of three decide.",
    runsOn: "Three Gemini models in parallel, 6 s cap each",
    receives: `Frames under ${FRAMES.maxAgeMs / 1000} s old · the step's yes/no question`,
    produces: "looks right · not yet · can't tell, plus one line to speak",
    sample: "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE.",
    sampleLabel: "checkStep(), step 5",
    code: "lib/ai/checkStep.ts",
  },
  {
    id: "judge",
    name: "Spoken gate",
    kind: "rules",
    short: "Won't skip breaker off or tester dead.",
    role: "Decides whether what the worker said counts. Instant and predictable.",
    runsOn: "Deterministic matcher, no model",
    receives: "The worker's exact words on a spoken step",
    produces: "Accept, or the question asked again",
    sample: "I need a clear answer on this one. Tell me what the tester reads.",
    sampleLabel: "judgeConfirmation(), “I think so”",
    code: "lib/ai/judgeConfirmation.ts",
  },
  {
    id: "recorder",
    name: "Recorder",
    kind: "agent",
    short: "Writes the record. Answers texts.",
    role: "Answers texts about the job and writes the work record.",
    runsOn: "iMessage via Photon · Gemini, with a rule-based fallback",
    receives: "Worker texts · the shared job memory",
    produces: "1–3 sentence replies · RecordEntry · the record link",
    sample: "You're on step 5 of 6: On the inert single-feed prop, connect the identified incoming pair to LINE … Call Boomer to keep going.",
    sampleLabel: "recorderReply() fallback",
    code: "lib/agents/recorder.ts · lib/jobs/close.ts",
  },
  {
    id: "share",
    name: "Share",
    kind: "agent",
    short: "Texts your supervisor, on your word.",
    role: "Reaches people other than the worker, only when the worker asks.",
    runsOn: "iMessage via Photon",
    receives: "“my supervisor is …”, “tell my supervisor …”, “send my record to …”",
    produces: "Saved contacts · supervisor alerts · record and job-sheet cards",
    sample: "I'll only text them when you ask, like “tell my supervisor I'm stuck on step 4”.",
    sampleLabel: "shareReply()",
    code: "lib/agents/share.ts · lib/jobs/approval.ts",
  },
  {
    id: "signup",
    name: "Sign-up",
    kind: "agent",
    short: "Sets a new worker up by text.",
    role: "Turns a first text from an unknown number into a worker profile.",
    runsOn: "iMessage via Photon · Gemini extraction, parser fallback",
    receives: "Free-text answers, often all at once",
    produces: "Worker: name, home town and its NEC edition, experience",
    sample: "Hi, this is Boomer. I talk electricians through jobs on the phone, check each step on camera, and keep a record of your work. What's your name?",
    sampleLabel: "signupReply(), first text",
    code: "lib/agents/signup.ts",
  },
  {
    id: "memory",
    name: "Job memory",
    kind: "store",
    short: "One memory every agent shares.",
    role: "One memory per job. Voice, vision and text all read and write it.",
    runsOn: "lib/db (Supabase or in-memory)",
    receives: "Events from the Guide, the Check panel and the Recorder",
    produces: "contextFor(): the job, steps, history and what was said",
    sample: "Multiple agents, one job memory.",
    sampleLabel: "lib/memory/store.ts",
    code: "lib/memory/store.ts",
  },
  {
    id: "lesson",
    name: "Lesson renderer",
    kind: "pipeline",
    short: "Turns jobs into reviewed lessons.",
    role: "Cuts a finished job into a reviewed training video.",
    runsOn: "Trusted local worker running FFmpeg",
    receives: "Session recordings · clips · freeze-frame annotations",
    produces: "MP4 with captions, chapters and sources, after review",
    sample: "Electrician review required. Worker publishing permission required.",
    sampleLabel: "publishProblems()",
    code: "lib/lessons/worker.ts · lib/lessons/types.ts",
  },
];

export const agent = (id: AgentId) => AGENTS.find((a) => a.id === id)!;

export const VOICE_TOOLS = [
  "get_context",
  "look",
  "next_step",
  "repeat_step",
  "explain_step",
  "go_back",
  "check_step",
  "stop_job",
  "finish_job",
  "wait_for_approval",
] as const;

/** The demo job's six steps, straight from data/steps.json. */
export const JOB = steps[0];
export const STEPS = JOB.steps.map((s, i) => ({
  n: i + 1,
  id: s.id,
  text: s.text,
  short: (s as { shortText?: string }).shortText ?? s.text,
  hardGate: !!(s as { hardGate?: boolean }).hardGate,
  kind: s.check.kind as "spoken" | "vision",
  question: s.check.question,
  reason: s.reason,
}));

const town = (city: string) => towns.find((t) => t.city === city)!;
export const PHILLY = town("Philadelphia");
export const PRINCETON = town("Princeton");

/** The scroll story. Order follows a real call through the code. */
export const STAGES = [
  { id: "call", n: "01", short: "Call", agent: "guide" as AgentId, title: "Strap on the phone. Call Boomer." },
  { id: "see", n: "02", short: "See", agent: "look" as AgentId, title: "Boomer sees what you see." },
  { id: "identify", n: "03", short: "Identify", agent: "look" as AgentId, title: "It works out the job." },
  { id: "plan", n: "04", short: "Plan", agent: "plan" as AgentId, title: "The steps come from a checked list." },
  { id: "signoff", n: "05", short: "Sign-off", agent: "share" as AgentId, title: "Your supervisor signs off by text." },
  { id: "guide", n: "06", short: "Guide", agent: "judge" as AgentId, title: "One step at a time. Some can't be skipped." },
  { id: "check", n: "07", short: "Check", agent: "checker" as AgentId, title: "Three models check the work." },
  { id: "record", n: "08", short: "Record", agent: "recorder" as AgentId, title: "The job becomes a record you own." },
  { id: "lesson", n: "09", short: "Lesson", agent: "lesson" as AgentId, title: "And a lesson, once an electrician reviews it." },
] as const;

export type StageId = (typeof STAGES)[number]["id"];
