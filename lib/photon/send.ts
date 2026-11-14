// OWNER: Zohaib (Photon)
import type { RecordEntry } from "@/lib/types";
import { photonConfigured, photonErrorText, sendPhotonText } from "@/lib/photon/client";
import { sendStableText, stableTexting } from "@/lib/photon/stable";

/**
 * Send one text. iMessage goes out on Photon 1.0 when it's set up (one number for texts and mini app cards,
 * see lib/photon/stable.ts); otherwise on Photon 2.0. Returns the message id.
 * Uses the real line whenever PHOTON_API_KEY + PHOTON_PROJECT_ID + a line number are set (even with USE_MOCKS=true),
 * so the record text can be tested before the rest of the stack is live. Otherwise it logs instead.
 * `dedupeKey` makes it safe to retry: Photon won't send the same key twice. Retries once on failure,
 * because the record link has to land within 10 s of the job closing.
 */
export async function sendText(phone: string, text: string, dedupeKey = `boomer:${phone}:${text.length}:${Date.now()}`): Promise<string> {
  if (stableTexting()) {
    try {
      return await sendStableText(phone, text);
    } catch (err) {
      if (!photonConfigured()) throw err;
      console.error("[photon] 1.0 text failed, trying 2.0:", String(err).slice(0, 200));
    }
  }
  if (!photonConfigured()) {
    console.log(`[mock photon] to ${phone}: ${text}`);
    return "mock-msg";
  }
  try {
    return await sendPhotonText(phone, text, dedupeKey);
  } catch (err) {
    console.error("[photon] send failed, retrying once:", photonErrorText(err));
    try {
      return await sendPhotonText(phone, text, dedupeKey);
    } catch (err2) {
      throw new Error(`Photon send failed: ${photonErrorText(err2)}`);
    }
  }
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
