// OWNER: Zohaib (Photon). Mini app cards for jobs and work records, with fallbacks so nothing depends on Photon 1.0:
//   1. Photon 1.0 mini app card (lib/photon/stable.ts) when PHOTON_STABLE_* is set
//   2. Photon 2.0 text with the same /m link, which unfurls into a preview card (Open Graph, app/api/og)
//   3. "none": the caller tells the worker to forward the card themselves
import type { Job, Worker } from "@/lib/types";
import { absolute, pages } from "@/lib/routes";
import { progressLine } from "@/lib/record/sheet";
import { sendText } from "./send";
import { cardKeys, sendMiniApp, sendStableText, stableConfigured, updateMiniApp } from "./stable";

export type Delivery = "card" | "link" | "none";

/** The URL changes with the job's state so iMessage re-reads the card caption on every update. */
export function jobCardUrl(job: Job): string {
  return `${absolute(pages.miniJob(job.id))}?v=${job.status}-${job.current}`;
}

export function recordCardUrl(worker: Worker): string {
  return absolute(pages.miniRecord(worker.id));
}

/** Live job sheet for `to` (the worker, or a supervisor they asked Boomer to tell). */
export async function sendJobCard(job: Job, to: string, intro?: string): Promise<Delivery> {
  return deliver(to, jobCardUrl(job), intro ?? `Job sheet · ${progressLine(job)}`, `job:${job.id}:${to}`, job.status === "guiding");
}

/** The work record sheet, for the worker or whoever they share it with. */
export async function sendRecordCard(worker: Worker, to: string, intro?: string): Promise<Delivery> {
  return deliver(to, recordCardUrl(worker), intro ?? `${worker.name}'s work record`, `record:${worker.id}:${to}`, false);
}

/** After a step moves: edit every card already sent for this job, in place. Never throws. */
export async function refreshJobCards(job: Job): Promise<number> {
  if (!stableConfigured()) return 0;
  let n = 0;
  for (const key of cardKeys(`job:${job.id}:`)) {
    try {
      if (await updateMiniApp(key, jobCardUrl(job), job.status === "guiding")) n++;
    } catch (err) {
      console.error("[miniapp] card update failed:", String(err).slice(0, 200));
    }
  }
  return n;
}

/** Text over 2.0 first (the worker's usual Boomer thread), then 1.0, which can start a new chat. */
export async function textAnyLine(to: string, text: string, key: string): Promise<boolean> {
  try {
    await sendText(to, text, key);
    return true;
  } catch (err) {
    if (!stableConfigured()) return false;
    console.error("[miniapp] 2.0 text failed, trying Photon 1.0:", String(err).slice(0, 160));
    try {
      await sendStableText(to, text);
      return true;
    } catch (err2) {
      console.error("[miniapp] 1.0 text failed:", String(err2).slice(0, 160));
      return false;
    }
  }
}

async function deliver(to: string, url: string, intro: string, key: string, live: boolean): Promise<Delivery> {
  if (stableConfigured()) {
    try {
      await sendMiniApp(to, url, { key, live });
      return "card";
    } catch (err) {
      console.error("[miniapp] Photon 1.0 card failed, falling back to a link:", String(err).slice(0, 200));
    }
  }
  try {
    await sendText(to, `${intro}\n${url}`, `${key}:${Date.now()}`);
    return "link";
  } catch (err) {
    console.error("[miniapp] link text failed:", String(err).slice(0, 200));
    return "none";
  }
}
