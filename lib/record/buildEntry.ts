// OWNER: Zohaib (record writer)
import type { Frame, Job, RecordEntry, WorkRecord, Worker } from "@/lib/types";
import { absolute, pages } from "@/lib/routes";

/** Finished job -> one record entry. Pure: pass in the frames the step results point at. */
export function buildRecordEntry(job: Job, frames: Map<string, Frame>, summary?: string): RecordEntry {
  const steps = job.steps.map((s, i) => {
    const r = job.results[i];
    return {
      order: s.order,
      text: s.text,
      tag: s.tag,
      status: r?.status ?? "pending",
      attempts: r?.attempts ?? 0,
      fails: r?.fails ?? 0,
      frameImage: r?.frameId ? frames.get(r.frameId)?.image : undefined,
      sourceUrl: s.sourceUrl,
      necSection: s.necSection,
    };
  });
  const done = steps.filter((s) => s.status === "seen" || s.status === "worker_confirmed");
  const start = Date.parse(job.startedAt ?? job.createdAt);
  const end = Date.parse(job.finishedAt ?? new Date().toISOString());
  return {
    id: `rec-${job.id}`,
    workerId: job.workerId,
    jobId: job.id,
    date: job.finishedAt ?? new Date().toISOString(),
    city: job.site?.city ?? "Unknown",
    state: job.site?.state ?? "",
    codeEdition: job.site?.necEdition ?? "unknown",
    jobType: job.jobType ?? "unknown",
    title: job.title ?? "Job",
    outcome: job.status === "stopped" ? "stopped" : "done",
    steps,
    counts: {
      total: steps.length,
      done: done.length,
      seen: steps.filter((s) => s.status === "seen").length,
      workerConfirmed: steps.filter((s) => s.status === "worker_confirmed").length,
      corrected: done.filter((s) => s.fails > 0).length,
      newHere: steps.filter((s) => s.tag === "new_here").length,
    },
    minutes: Math.max(1, Math.round((end - start) / 60000)),
    summary,
  };
}

export function buildWorkRecord(worker: Worker, entries: RecordEntry[]): WorkRecord {
  const count = (key: (e: RecordEntry) => string) =>
    entries.reduce<Record<string, number>>((acc, e) => ((acc[key(e)] = (acc[key(e)] ?? 0) + 1), acc), {});
  return {
    worker,
    entries,
    totals: { jobs: entries.length, byJobType: count((e) => e.jobType), byState: count((e) => e.state) },
    shareUrl: absolute(pages.workRecord(worker.id)),
  };
}
