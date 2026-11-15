// OWNER: Sunny (AI). Shared Gemini helpers so every AI function retries and times out the same way.
import { GoogleGenAI } from "@google/genai";
import { USE_MOCKS } from "@/lib/config";

export const TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
export const VISION_MODEL = process.env.GEMINI_VISION_MODEL || TEXT_MODEL;

const TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 2000;

let client: GoogleGenAI | null = null;

/** True when real Gemini calls should be attempted. */
export function geminiEnabled(): boolean {
  return !USE_MOCKS && !!process.env.GEMINI_API_KEY;
}

export function gemini(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * Runs a Gemini call with a timeout and one retry on overload (503) or a per-minute rate limit (429).
 * `timeoutMs` caps the whole thing, retry included, so a caller with a hard deadline (a voice tool) can rely on it.
 * A used-up daily quota is not retried: it won't clear in seconds.
 */
export async function callGemini<T>(fn: () => Promise<T>, { timeoutMs = TIMEOUT_MS }: { timeoutMs?: number } = {}): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (err) {
    const msg = errorText(err);
    if (!/\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(msg) || quotaExhausted(msg)) throw err;
    const left = deadline - Date.now() - RETRY_DELAY_MS;
    if (left < 1000) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return withTimeout(fn(), left);
  }
}

/** True for a 429 that won't clear soon: a per-day quota, e.g. the free tier's 500 requests a day. */
export function quotaExhausted(msg: string): boolean {
  return /RESOURCE_EXHAUSTED|\b429\b/.test(msg) && /per day|PerDay|retry in \d+h/i.test(msg);
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Gemini timed out after ${ms}ms`)), ms)),
  ]);
}
