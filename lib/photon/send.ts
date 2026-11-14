// OWNER: Z (Photon + backend)
import type { Case, Stage } from "@/lib/types";
import { USE_MOCKS } from "@/lib/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Page each stage's mini app card opens (Teammate 1 builds these). */
export function cardUrl(c: Case, stage: Stage): string {
  return `${APP_URL}/mini/${stage === "local" ? "review" : "approve"}/${c.id}`;
}

/**
 * Send the intro text + a mini app card to a stage's phone number.
 * Returns the miniAppCardSession so the card can be edited in place later.
 * TODO(Z): spectrum-ts + @spectrum-ts/imessage. Card = app content pointing at cardUrl().
 */
export async function sendCard(c: Case, stage: Stage, intro: string): Promise<{ messageId: string; cardSession?: string }> {
  if (USE_MOCKS) {
    console.log(`[mock photon] ${stage}: ${intro} | card ${cardUrl(c, stage)}`);
    return { messageId: "mock-msg", cardSession: "mock-session" };
  }
  throw new Error("sendCard not implemented");
}

/** Edit a live card in place (e.g. "Approved", then AR progress). TODO(Z). */
export async function updateCard(c: Case, stage: Stage): Promise<void> {
  if (USE_MOCKS) {
    console.log(`[mock photon] update ${stage} card for ${c.id}: ${c.status}`);
    return;
  }
  throw new Error("updateCard not implemented");
}

/** Plain text, used for questions relayed from the voice agent. TODO(Z). */
export async function sendText(phone: string, text: string): Promise<string> {
  if (USE_MOCKS) {
    console.log(`[mock photon] to ${phone}: ${text}`);
    return "mock-msg";
  }
  throw new Error("sendText not implemented");
}

// Kept for older call sites.
export const sendToReviewer = (c: Case) => sendCard(c, "local", "").then((r) => r.messageId);
export const sendToManager = (c: Case) => sendCard(c, "manager", "").then((r) => r.messageId);
