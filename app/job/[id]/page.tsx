"use client";
// OWNER: Andy (screens). Live job view (laptop, faces the judge): latest frame, step list with ticks
// and New here tags, the agent's last line. Polls the job every second.
import Link from "next/link";
import { useJob } from "@/components/hooks/useJob";
import { api, pages } from "@/lib/routes";
import { STATUS_LABEL } from "@/lib/copy";

export default function LiveJobPage({ params }: { params: { id: string } }) {
  const { data: job, stale, notFound } = useJob(params.id, { intervalMs: 1000 });
  if (notFound) return <main><h1>No job {params.id}</h1></main>;
  if (!job) return <main><p className="muted">Loading…</p></main>;

  return (
    <main style={{ maxWidth: 1100 }}>
      <h1>{job.title ?? "New job"}</h1>
      <p className="muted">
        {STATUS_LABEL[job.status]}
        {job.status === "guiding" && ` · step ${Math.min(job.current + 1, job.steps.length)} of ${job.steps.length}`}
        {job.site && ` · ${job.site.city}, ${job.site.state} (${job.site.necEdition} NEC)`}
        {stale && " · live updates paused"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24, marginTop: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${api.latestFrame(job.id)}?t=${job.updatedAt}`} alt="Latest camera frame" style={{ width: "100%", borderRadius: 12, background: "#111" }} />
        <ol style={{ display: "grid", gap: 12 }}>
          {job.steps.map((s, i) => {
            const r = job.results[i];
            const done = r?.status === "seen" || r?.status === "worker_confirmed";
            return (
              <li key={s.id} style={{ fontWeight: i === job.current ? 700 : 400, opacity: done ? 0.7 : 1 }}>
                {done ? "✓ " : r?.status === "not_yet" ? "✗ " : ""}
                {s.text} {s.tag === "new_here" && <span className="tag-new">New here</span>}
                {r?.fails ? <span className="muted"> ({r.fails} corrected)</span> : null}
              </li>
            );
          })}
        </ol>
      </div>

      {job.lastSay && <p className="card" style={{ marginTop: 24, fontSize: "var(--fs-step)" }}>Boomer: “{job.lastSay.text}”</p>}
      {job.recordId && <p style={{ marginTop: 16 }}><Link href={pages.jobRecord(job.id)}>Job record</Link></p>}
    </main>
  );
}
