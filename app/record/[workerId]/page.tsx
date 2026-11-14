"use client";
// OWNER: Andy (screens). Work record: all jobs, totals, share link, and the gap list if built.
import Link from "next/link";
import type { WorkRecord } from "@/lib/types";
import { usePoll } from "@/components/hooks/useJob";
import { api, pages } from "@/lib/routes";
import { RECORD_LABEL } from "@/lib/copy";

export default function WorkRecordPage({ params }: { params: { workerId: string } }) {
  const { data: rec, notFound } = usePoll<WorkRecord>(api.record(params.workerId), { intervalMs: 5000 });
  if (notFound) return <main><h1>No worker {params.workerId}</h1></main>;
  if (!rec) return <main><p className="muted">Loading…</p></main>;
  return (
    <main>
      <p className="muted">{RECORD_LABEL}</p>
      <h1>{rec.worker.name}</h1>
      <p className="muted">Home: {rec.worker.home.city}, {rec.worker.home.state} · {rec.totals.jobs} jobs</p>
      <p className="muted">By state: {Object.entries(rec.totals.byState).map(([k, v]) => `${k} ${v}`).join(", ") || "none yet"}</p>
      <p style={{ marginTop: 8 }}>Share: <a href={rec.shareUrl}>{rec.shareUrl}</a></p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, marginTop: 24 }}>
        {rec.entries.map((e) => (
          <li key={e.id} className="card">
            <Link href={pages.jobRecord(e.jobId)}>{e.title}</Link>
            <p className="muted">{e.city}, {e.state} · {new Date(e.date).toLocaleDateString()} · {e.counts.done}/{e.counts.total} steps · {e.counts.corrected} corrected</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
