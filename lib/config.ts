// SHARED. Read env in one place so lanes don't each invent their own flags.

/** true = every lane returns mock data, so the app runs before anything is wired up. */
export const USE_MOCKS = process.env.USE_MOCKS !== "false";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Frame and check timing from the game plan. */
export const FRAMES = {
  /** Camera page sends a still this often. */
  intervalMs: 2000,
  /** Burst size sent on "done". */
  burst: 3,
  /** Long edge in px after downscaling on the phone. */
  maxEdgePx: 1024,
  /** Checks never use a frame older than this. */
  maxAgeMs: 10_000,
  /** Frames kept per job in memory (older ones are dropped unless a step result points at them). */
  keepPerJob: 30,
} as const;

/** The check should answer within ~3 s of "done". */
export const CHECK_BUDGET_MS = 3000;

/** After this many "can't tell" answers the worker may confirm out loud. */
export const UNCLEAR_RETRIES = 1;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. See .env.example`);
  return v;
}
