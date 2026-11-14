// SHARED. Exact wording from the game plan. Use these instead of typing your own.
// Never use "safe", "compliant", "code-approved", "passed" or "certified" for anything the AI produces.

export const SAY = {
  looksRight: "Looks right.",
  notYet: "Not yet.",
  cantTell: "Can't tell from here. Hold it closer and keep still.",
  checking: "Checking.",
  workerConfirmed: "Worker confirmed.",
  sourceSays: "Source says",
  stillThere: (stepNumber: number) => `Still there? You're on step ${stepNumber}.`,
  welcomeBack: (stepNumber: number) => `Welcome back. You were on step ${stepNumber}.`,
  differentFrom: (homeCity: string) => `This one is different from ${homeCity}.`,
  stop: "Stopping here. Make the work safe before you leave it, and tell your supervisor.",
  dontKnow: "I don't know that one. Ask your supervisor.",
  hardGate: "I can't skip this one. Tell me when it's done.",
  staleFrame: "I don't have a fresh picture. Point the camera at the work and keep still.",
} as const;

/** The safety line, used everywhere (pitch, record page, agent prompt). */
export const SAFETY_LINE =
  "Boomer guides and checks what the camera can see; the electrician tests, decides and stays responsible.";

/** Label on every record. */
export const RECORD_LABEL = "Observed by Boomer";

/** Words that must never appear in AI output. Sunny's prompts and Andy's UI can test against this. */
export const BANNED_WORDS = ["safe", "compliant", "code-approved", "passed", "certified"] as const;

export const STATUS_LABEL: Record<import("@/lib/types").JobStatus, string> = {
  new: "New",
  looking: "Looking",
  plan_ready: "Plan ready",
  guiding: "Guiding",
  done: "Done",
  stopped: "Stopped",
};
