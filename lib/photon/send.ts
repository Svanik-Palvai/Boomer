// OWNER: Zohaib (Photon)
import type { RecordEntry } from "@/lib/types";
import { USE_MOCKS } from "@/lib/config";

/**
 * Send one iMessage through Photon. Returns the Photon message id.
 * TODO(Zohaib): spectrum-ts + @spectrum-ts/imessage (IMESSAGE_PROJECT_ID / IMESSAGE_PROJECT_SECRET).
 */
export async function sendText(phone: string, text: string): Promise<string> {
  if (USE_MOCKS) {
    console.log(`[mock photon] to ${phone}: ${text}`);
    return "mock-msg";
  }
  throw new Error("sendText not implemented");
}

/** The text after the job, worded as in the game plan. */
export function recordText(e: RecordEntry, link: string): string {
  const { total, done, seen, corrected, newHere } = e.counts;
  const parts = [
    `[Job ${e.jobId.replace(/^demo-/, "")}] ${e.title}, ${e.city} ${e.state} (${e.codeEdition} NEC).`,
    `${done} of ${total} steps done: ${seen} seen on camera${corrected ? `, ${corrected} corrected` : ""}.`,
    newHere ? `${newHere} step${newHere === 1 ? " was" : "s were"} new for you here.` : "",
    `Your record: ${link}`,
  ];
  return parts.filter(Boolean).join(" ");
}
