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

/** Runs a Gemini call with a timeout and one retry on overload (503) or rate limit (429). */
export async function callGemini<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await withTimeout(fn(), TIMEOUT_MS);
  } catch (err) {
    const msg = errorText(err);
    if (!/\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED/.test(msg)) throw err;
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    return withTimeout(fn(), TIMEOUT_MS);
  }
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
