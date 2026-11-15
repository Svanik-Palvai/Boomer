// OWNER: Zohaib (backend). Where each iMessage mini app card was sent, so any server can edit it in place later.
// On Vercel the voice tool that moves a step usually runs on a different instance than the one that sent the card,
// so the chat and message ids live here instead of only in memory.
import { backend } from "./backend";
import { nowIso, ready } from "./memoryStore";

export interface CardRef {
  /** e.g. "job:<jobId>:<phone>" or "record:<workerId>:<phone>" (lib/photon/miniapp.ts) */
  key: string;
  phone: string;
  /** Photon 1.0 chat id (space.id) and message id of the card bubble */
  spaceId: string;
  messageId: string;
  url: string;
  at: string;
}

const jobOf = (key: string) => (key.startsWith("job:") ? key.split(":")[1] : undefined);

export async function saveCardRef(ref: Omit<CardRef, "at">): Promise<void> {
  await ready();
  await backend().put<CardRef>("card", ref.key, { ...ref, at: nowIso() }, { jobId: jobOf(ref.key), phone: ref.phone });
}

export async function getCardRef(key: string): Promise<CardRef | null> {
  await ready();
  return backend().get<CardRef>("card", key);
}

/** Every card sent for one job (the worker's and any supervisor's). */
export async function listJobCardRefs(jobId: string): Promise<CardRef[]> {
  await ready();
  return backend().list<CardRef>("card", { jobId });
}
