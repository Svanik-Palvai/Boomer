// OWNER: Z (backend)
import type { Case } from "@/lib/types";
import { demoCase, DEMO_CASE_ID } from "@/lib/mock/demoCase";

/**
 * In-memory case store so the app runs on day one.
 * TODO(Z): swap the body of these functions for Supabase. Keep the signatures.
 */
const g = globalThis as unknown as { __cases?: Map<string, Case> };
const cases = g.__cases ?? (g.__cases = new Map([[DEMO_CASE_ID, demoCase()]]));

export async function getCase(id: string): Promise<Case | null> {
  return cases.get(id) ?? null;
}

export async function saveCase(c: Case): Promise<Case> {
  const updated = { ...c, updatedAt: new Date().toISOString() };
  cases.set(c.id, updated);
  return updated;
}

export async function resetDemoCase(): Promise<Case> {
  const c = demoCase();
  cases.set(c.id, c);
  return c;
}
