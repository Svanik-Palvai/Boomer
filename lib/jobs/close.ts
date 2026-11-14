// OWNER: Zohaib (job close → record → iMessage)
import type { Frame, Job, RecordEntry } from "@/lib/types";
import { getFrame, getRecordEntryByJob, getWorker, saveRecordEntry, updateJob } from "@/lib/db";
import { buildRecordEntry } from "@/lib/record/buildEntry";
import { recordText, sendText } from "@/lib/photon/send";
import { summarizeJob } from "@/lib/ai/summarize";
import { absolute, pages } from "@/lib/routes";
import { remember } from "@/lib/memory/store";
import { refreshJobCards, sendJobCard } from "@/lib/photon/miniapp";
import { stableConfigured } from "@/lib/photon/stable";

/**
 * Called once the job is done or stopped. Idempotent: a second call returns the same entry and
 * does not text again. Writes the record entry, then texts the link to the worker.
 * Done when: the link arrives within 10 s of the job closing.
 */
export async function closeJob(job: Job): Promise<RecordEntry> {
  const existing = await getRecordEntryByJob(job.id);
  if (existing) return existing;

  const frames = new Map<string, Frame>();
  for (const r of job.results) {
    if (!r.frameId) continue;
    const f = await getFrame(job.id, r.frameId);
    if (f) frames.set(f.id, f);
  }

  const summary = await summarizeJob(job).catch(() => undefined);
  const entry = await saveRecordEntry(buildRecordEntry(job, frames, summary));
  await updateJob(job.id, (j) => ({ ...j, recordId: entry.id }));

  const worker = await getWorker(job.workerId);
  if (worker) {
    const text = recordText(entry, absolute(pages.jobRecord(job.id)));
    try {
      await sendText(worker.phone, text, `boomer-record:${entry.id}`);
      await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text });
    } catch (err) {
      // The fallback is the link + QR on the live job view, so a failed text must not fail the close.
      console.error("[closeJob] record text failed:", err);
    }
    // Photon 1.0: freeze any live job cards at their final state, then hand the worker the finished job sheet as a
    // mini app card. After the text above, so the 10 s record text never waits on Photon 1.0.
    if (stableConfigured()) {
      const closed = { ...job, recordId: entry.id };
      void refreshJobCards(closed)
        .then((n) => (n ? undefined : sendJobCard(closed, worker.phone, "Your finished job sheet")))
        .catch((err) => console.error("[closeJob] mini app card failed:", err));
    }
  }
  return entry;
}
