/**
 * SHARED CONTRACT. Every lane codes against these types.
 * Do not change a field without posting in the team chat first.
 * Adding a new optional field is fine; renaming or removing one is not.
 */

export type CaseStatus =
  | "new"
  | "checks_done"
  | "with_local_reviewer"
  | "plan_revised"
  | "with_manager"
  | "approved"
  | "guiding"
  | "done"
  | "open_unverified";

/** Who a review message goes to. */
export type Stage = "local" | "manager";

export interface Jurisdiction {
  city: string;
  state: string; // two-letter, e.g. "NJ"
  necEdition: string; // e.g. "2023"
  sourceUrl: string; // official page listing the adopted edition
}

export interface Job {
  id: string;
  photoUrl?: string;
  note?: string;
  component: string; // "kitchen countertop receptacle"
  task: string; // "replace receptacle"
  confidence: number; // 0..1 from identify_job
  home: Jurisdiction; // where the worker usually works
  site: Jurisdiction; // where this job is
  lat?: number;
  lng?: number;
}

export type CheckType =
  | "job_identity"
  | "location"
  | "code_edition"
  | "local_amendments"
  | "rule_difference"
  | "permit"
  | "inspection"
  | "license"
  | "parts"
  | "safety";

export interface Check {
  id: string;
  type: CheckType;
  title: string;
  result: string;
  status: "found" | "none_found" | "needs_review";
  sourceUrl?: string;
  ruleId?: string;
}

/** One entry in data/rules.json (Teammate 4). */
export interface Rule {
  id: string;
  jurisdiction: string; // "NJ" or "Philadelphia, PA"
  edition: string; // "2023"
  necSection: string; // "210.8(A)(6)"
  topic: string;
  summary: string;
  sourceUrl: string;
  caveat: string;
  verified: boolean; // false = never shown as fact in the app
  appliesTo: string[]; // job components this rule matters for
  addsSteps: { text: string; arStepId?: string }[]; // what build_plan inserts as "new_here"
}

export interface PlanStep {
  id: string;
  order: number;
  text: string;
  tag: "standard" | "new_here";
  ruleId?: string;
  sourceUrl?: string;
  arStepId?: string; // matches an AR overlay in the guide
  addedBy: "plan" | "local_reviewer" | "manager";
}

export interface Review {
  stage: Stage;
  phone: string;
  decision: "pending" | "confirmed" | "changes" | "approved" | "rejected";
  at?: string; // ISO time
}

export interface Message {
  id: string;
  caseId: string;
  photonMessageId?: string; // used for dedup
  stage: Stage;
  direction: "out" | "in";
  from: string;
  body: string;
  at: string;
}

/** Output of parse_reply (Teammate 3). */
export type Action =
  | { type: "confirm_plan" }
  | { type: "add_step"; text: string }
  | { type: "remove_step"; stepId: string }
  | { type: "approve" }
  | { type: "reject"; reason?: string }
  | { type: "question"; text: string }
  | { type: "unclear" };

/** Where something was said. */
export type Channel = "imessage" | "voice" | "mini_app" | "app";

/** The three agents that share one case memory. */
export type AgentName = "field" | "review" | "code";

/**
 * One remembered fact or utterance for a case. Every agent writes here and
 * reads from here, so a change said in a text is known on the next call.
 */
export interface MemoryEvent {
  id: string;
  caseId: string;
  channel: Channel;
  agent?: AgentName; // which agent handled it
  speaker: "worker" | "local_reviewer" | "manager" | "agent";
  text: string; // what was said, or a one-line summary of a call
  at: string;
}

/** Structured result from a mini app card tap (preferred over free text). */
export interface CardDecision {
  caseId: string;
  stage: Stage;
  decision: "confirmed" | "changes" | "approved" | "rejected";
  stepEdits?: { stepId?: string; text: string; action: "add" | "edit" | "remove" }[];
  note?: string;
}

export interface Case {
  id: string;
  job: Job;
  checks: Check[];
  plan: PlanStep[];
  status: CaseStatus;
  reviews: Review[];
  messages: Message[];
  memory?: MemoryEvent[];
  /** Photon miniAppCardSession per stage, used to edit the live card in place. */
  cardSessions?: Partial<Record<Stage, string>>;
  /** Which New here steps the worker has finished in the AR guide. */
  arProgress?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookEntry {
  caseId: string;
  town: string;
  state: string;
  jobType: string;
  planSummary: string;
  reviewers: string[];
  date: string;
}
