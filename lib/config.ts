// SHARED. Read env in one place so lanes don't each invent their own flags.

/** true = every lane returns mock data, so the app runs before anything is wired up. */
export const USE_MOCKS = process.env.USE_MOCKS !== "false";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Frame and check timing from the game plan. */
export const FRAMES = {
  /**
   * Camera page sends a still this often (skipped while one is still uploading). Uploads cost bandwidth only:
   * Gemini runs on a check, not per frame. Shorter = a fresher picture sooner after "done".
   */
  intervalMs: 500,
  /** Burst size sent on "done". */
  burst: 3,
  /** Frames sent to each reviewer in a step check (newest first). */
  checkFrames: 2,
  /** After "done", how long a check waits for the first post-"done" burst frame before using what it has. */
  freshWaitMs: 2500,
  /**
   * Long edge in px after downscaling on the phone. 768 was too small to read the LINE / LOAD print from chest height
   * (the checker guessed, and guessed differently each time).
   */
  maxEdgePx: 1024,
  /** JPEG quality of the stills (0 to 1). */
  jpegQuality: 0.8,
  /** Checks never use a frame older than this. */
  maxAgeMs: 10_000,
  /** Frames kept per job in memory (older ones are dropped unless a step result points at them). */
  keepPerJob: 30,
} as const;

/** The check should answer within ~3 s of "done". */
export const CHECK_BUDGET_MS = 3000;

/**
 * wait_for_approval holds the call this long for the supervisor's answer, then returns { waiting: true } so the
 * agent can hear the worker and call it again. Keep it under the tool's ElevenLabs response timeout (lib/agent/tools.ts).
 */
export const APPROVAL_WAIT = {
  windowMs: Number(process.env.APPROVAL_WAIT_MS) || 20_000,
  pollMs: Number(process.env.APPROVAL_POLL_MS) || 500,
} as const;

/**
 * After more than this many camera checks that did not pass ("can't tell" or "not yet"), the worker may say "confirm"
 * and the step is logged as worker confirmed, not seen. "Not yet" counts too: a checker that keeps misreading the
 * photo must not be able to hold the worker on a step forever.
 */
export const UNCLEAR_RETRIES = 1;
/** Same, for steps the camera is meant to see (the LINE step): more tries before the worker's word is taken. */
export const SEEN_ONLY_RETRIES = 2;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. See .env.example`);
  return v;
}
