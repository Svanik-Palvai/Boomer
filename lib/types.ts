/**
 * SHARED CONTRACT. Every lane codes against these types.
 * Adding a new OPTIONAL field is fine. Renaming, removing or changing a field: post in team chat first.
 *
 * Data model (game plan v2): Worker · Job · Step · StepResult · Frame · MemoryEvent · RecordEntry.
 * Everything during a job hangs off one Job record.
 */

// ───────────────────────── Places and code data (Aniketh) ─────────────────────────

/** A town plus the NEC edition it has adopted. */
export interface Jurisdiction {
  city: string;
  state: string; // two-letter, e.g. "NJ"
  necEdition: string; // "2023", or "needs review" for a town we haven't researched
  sourceUrl: string; // official page listing the adopted edition
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number; // meters, from the browser
}

/** One entry in data/rules.json. Hand-checked; never shown as fact unless verified. */
export interface Rule {
  id: string;
  jurisdiction: string; // "NJ" or "Princeton, NJ"
  edition: string; // "2023"
  necSection: string; // "210.8(A)(6)"
  topic: string;
  summary: string;
  /** One sentence the agent says when the worker asks "why?" on a New here step. */
  why: string;
  sourceUrl: string;
  caveat: string;
  verified: boolean;
  /** Job types this rule matters for, matching JobTemplate.jobType. */
  jobTypes: string[];
  /** Home jurisdictions this is a difference from, e.g. ["PA", "Philadelphia, PA"]. */
  differsFrom: string[];
  /** Step ids (from data/steps.json) this rule makes "New here". */
  tagsSteps: string[];
}

/** Stretch: one line of the gap list (data/gaps.json). */
export interface GapItem {
  id: string;
  fromState: string; // "PA"
  toState: string; // "NJ"
  requirement: string;
  sourceUrl: string;
  verified: boolean;
  /** Job type or record fact that would cover this, if any. */
  coveredBy?: string;
}

// ───────────────────────── Steps (Aniketh writes the data, Sunny's engine runs it) ─────────────────────────

export type StepTag = "standard" | "new_here";

/** vision = checked from a camera frame; spoken = the worker confirms out loud. */
export type CheckKind = "vision" | "spoken";

export interface StepCheck {
  kind: CheckKind;
  /** One yes/no question a single frame (or a spoken answer) can settle. */
  question: string;
  /** What "looks right" means, for the vision prompt. */
  expect?: string;
  /** For spoken checks: what the agent asks, e.g. "Tell me what the tester reads." */
  prompt?: string;
}

/** One step of a job template in data/steps.json. */
export interface StepTemplate {
  id: string; // stable, e.g. "gfci-5-line"
  text: string; // what the agent reads
  reason: string; // one sentence for "why?"
  check: StepCheck;
  /** Hard gates can't be skipped by voice (breaker off, tester shows dead). */
  hardGate?: boolean;
  /** Journeyman profile: standard steps collapse into this short line. */
  shortText?: string;
}

export interface JobTemplate {
  jobType: string; // "gfci-swap"
  title: string; // "Swap a kitchen counter receptacle for a GFCI"
  component: string; // "kitchen countertop receptacle"
  steps: StepTemplate[];
}

/** A step on a live job: the template step plus its tag for this town. */
export interface Step extends StepTemplate {
  order: number; // 1-based
  tag: StepTag;
  ruleId?: string;
  necSection?: string;
  sourceUrl?: string;
  /** False when the rule that tags this step is not hand-checked yet. UI/agent must say so. */
  ruleVerified?: boolean;
}

// ───────────────────────── Workers ─────────────────────────

/** Changes how the agent talks, not what it does. */
export type Experience = "new" | "journeyman";

export interface Worker {
  id: string;
  name: string;
  phone: string; // E.164, e.g. "+12155550123". Used to match calls and send the record.
  home: Jurisdiction;
  experience: Experience;
  createdAt: string;
}

// ───────────────────────── Jobs ─────────────────────────

/** New → Looking → Plan ready → Guiding (step n of N) → Done (or Stopped). */
export type JobStatus = "new" | "looking" | "plan_ready" | "guiding" | "done" | "stopped";

/** What Gemini thinks it sees (identifyJob). */
export interface JobIdentity {
  component: string; // "kitchen countertop receptacle"
  problem: string; // "standard receptacle, needs GFCI"
  jobType?: string; // matched JobTemplate.jobType, if any
  details?: string;
  confidence: number; // 0..1
  source: "gemini" | "fallback";
  /** Why it fell back: no fresh camera frame, or the model call failed. The agent says so instead of claiming to see. */
  fallbackReason?: "no_frame" | "model_error";
  /** The model error text, for debugging from the job JSON. */
  fallbackError?: string;
}

/**
 * Supervisor sign-off on the plan, by iMessage. "approved" and "changes" both unlock step 1
 * ("changes" = approved with a note the worker hears first). "rejected" holds the job.
 * The note is added to the job; it never rewrites the checked steps.
 */
export type ApprovalStatus = "waiting" | "approved" | "changes" | "rejected";

export interface PlanApproval {
  status: ApprovalStatus;
  supervisorPhone: string;
  supervisorName?: string;
  /** How the plan reached the supervisor: card, plain text, or not at all (worker must forward it). */
  delivery: "card" | "text" | "none";
  sentAt: string;
  decidedAt?: string;
  /** The supervisor's words when they asked for changes or said hold off. */
  note?: string;
  /** True once the agent has read the decision (and note) to the worker. */
  told?: boolean;
}

export type StepStatus = "pending" | "seen" | "worker_confirmed" | "not_yet";

export interface StepResult {
  stepId: string;
  status: StepStatus;
  attempts: number; // every check run
  fails: number; // "not yet" answers; >0 and finally seen = "corrected"
  unclear: number; // "can't tell" answers
  frameId?: string; // the frame the passing check used
  confirmedText?: string; // what the worker said, for spoken checks
  startedAt?: string;
  doneAt?: string;
}

/** The voice-tool contract for a check. The agent speaks `say` and never turns "unclear" into "pass". */
export type CheckOutcome = "pass" | "fail" | "unclear";

export interface CheckResult {
  outcome: CheckOutcome;
  say: string; // one short line to speak
  seen?: string; // what the model saw
  expected?: string;
  frameId?: string;
  ms?: number;
  votes?: CheckVote[]; // one per reviewer when the step check runs as a panel (lib/ai/checkStep.ts)
}

/** One reviewer's answer in the step-check panel. */
export interface CheckVote {
  reviewer: "inspector" | "wiring" | "photo";
  model: string;
  outcome: CheckOutcome;
  seen?: string;
  expected?: string;
  fix?: string;
  ms: number;
  error?: boolean;
}

export interface Job {
  id: string;
  workerId: string;
  status: JobStatus;
  jobType?: string;
  title?: string;
  identity?: JobIdentity;
  home: Jurisdiction; // copied from the worker when the job opens
  site?: Jurisdiction; // from GPS, confirmed out loud
  point?: GeoPoint;
  siteConfirmed?: boolean;
  steps: Step[];
  /** Index into steps of the step being worked. steps.length when all are done. */
  current: number;
  results: StepResult[];
  memory: MemoryEvent[];
  /** ElevenLabs conversation ids seen, for resume and dedup. */
  callIds: string[];
  recordId?: string;
  /** Supervisor sign-off on the plan (absent when no supervisor is on file). */
  approval?: PlanApproval;
  stoppedReason?: string;
  /** The agent's last spoken line, for the live job view. Set by the voice tool wrapper. */
  lastSay?: { text: string; tool: VoiceToolName; at: string };
  createdAt: string;
  updatedAt: string;
  startedAt?: string; // first step read
  finishedAt?: string;
}

// ───────────────────────── Frames (camera page → backend) ─────────────────────────

export interface Frame {
  id: string;
  jobId: string;
  workerId: string;
  at: string; // server receive time, ISO
  /** data URL ("data:image/jpeg;base64,...") or a storage URL once Supabase is in. */
  image: string;
  burst?: boolean; // part of the burst of 3 sent on "done"
}

/** Body of POST /api/frames. */
export interface FrameUpload {
  workerId: string;
  jobId?: string; // omit and the backend attaches it to the worker's open job
  image: string; // data URL, ~1024 px JPEG
  burst?: boolean;
  point?: GeoPoint;
}

/** Response of POST /api/frames: enough for the camera page's step number and connection dot. */
export interface FrameAck {
  ok: true;
  frameId: string;
  jobId: string;
  status: JobStatus;
  stepNumber: number | null; // 1-based, null before guiding
  stepCount: number;
  /** True when the agent just ran "done": the camera page should send a burst of 3. */
  wantBurst?: boolean;
}

// ───────────────────────── Memory (multiple agents, one job memory) ─────────────────────────

export type Channel = "voice" | "imessage" | "app";

/** guide = voice agent, checker = vision, recorder = record writer + iMessage. */
export type AgentName = "guide" | "checker" | "recorder";

export interface MemoryEvent {
  id: string;
  jobId: string;
  channel: Channel;
  agent?: AgentName;
  speaker: "worker" | "agent" | "system";
  text: string;
  at: string;
}

// ───────────────────────── Voice tools (ElevenLabs server tools → /api/voice/*) ─────────────────────────

export type VoiceToolName =
  | "get_context"
  | "look"
  | "next_step"
  | "repeat_step"
  | "explain_step"
  | "go_back"
  | "check_step"
  | "stop_job"
  | "finish_job";

/** Every voice tool takes this body. Either jobId or callerPhone must resolve to a job. */
export interface VoiceToolRequest {
  jobId?: string;
  callerPhone?: string; // ElevenLabs system__caller_id
  conversationId?: string; // ElevenLabs system__conversation_id
  /** check_step on a spoken step, or after "can't tell" twice: what the worker said. */
  spokenConfirmation?: string;
  /** look: what the worker said the problem is. */
  note?: string;
  /** stop_job: why. */
  reason?: string;
}

/** Every voice tool returns this. `say` is the one line the agent speaks. */
export interface VoiceToolResponse {
  say: string;
  jobId?: string;
  status?: JobStatus;
  stepNumber?: number | null;
  stepCount?: number;
  check?: CheckResult;
  /** get_context only: the text block for the agent's prompt. */
  context?: string;
  error?: string;
}

/** One logged tool call. Feeds the traction numbers. */
export interface ToolLog {
  id: string;
  jobId?: string;
  tool: VoiceToolName;
  request: VoiceToolRequest;
  response: VoiceToolResponse;
  ms: number;
  at: string;
}

// ───────────────────────── Work record ─────────────────────────

export interface RecordStep {
  order: number;
  text: string;
  tag: StepTag;
  status: StepStatus;
  attempts: number;
  fails: number;
  frameImage?: string;
  sourceUrl?: string;
  necSection?: string;
}

/** One finished job in a worker's record. Labeled "observed by Boomer", never "certified". */
export interface RecordEntry {
  id: string;
  workerId: string;
  jobId: string;
  date: string; // ISO
  city: string;
  state: string;
  codeEdition: string;
  jobType: string;
  title: string;
  outcome: "done" | "stopped";
  steps: RecordStep[];
  counts: {
    total: number;
    done: number;
    seen: number;
    workerConfirmed: number;
    corrected: number;
    newHere: number;
  };
  minutes: number;
  summary?: string; // Gemini record summary (optional)
  /** Who signed off on the plan, when, and any note they added. */
  approval?: { by: string; at: string; status: ApprovalStatus; note?: string };
}

export interface WorkRecord {
  worker: Worker;
  entries: RecordEntry[];
  totals: {
    jobs: number;
    byJobType: Record<string, number>;
    byState: Record<string, number>;
  };
  shareUrl: string;
}
