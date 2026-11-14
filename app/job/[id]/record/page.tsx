"use client";
// OWNER: Andy (screens). One finished job: every step, its check photo and its result.
import Link from "next/link";
import type { RecordEntry } from "@/lib/types";
import { usePoll } from "@/components/hooks/useJob";
import { api, pages } from "@/lib/routes";
import { RECORD_LABEL } from "@/lib/copy";

const RESULT = { seen: "Seen on camera", worker_confirmed: "Worker confirmed, not seen", not_yet: "Not finished", pending: "Not reached" };

export default function JobRecordPage({ params }: { params: { id: string } }) {
  const { data: e, notFound } = usePoll<RecordEntry>(api.jobRecord(params.id), { intervalMs: 3000 });
  if (notFound) return <main><p className="muted">This job isn't finished yet.</p></main>;
  if (!e) return <main><p className="muted">Loading…</p></main>;
  return (
    <main>
      <p className="muted">{RECORD_LABEL}</p>
      <h1>{e.title}</h1>
      <p className="muted">{e.city}, {e.state} · {e.codeEdition} NEC · {new Date(e.date).toLocaleDateString()} · {e.minutes} min</p>
      <ol style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {e.steps.map((s) => (
          <li key={s.order} className="card">
            <p>{s.text} {s.tag === "new_here" && <span className="tag-new">New here</span>}</p>
            <p className="muted">{RESULT[s.status]}{s.fails ? `, corrected ${s.fails}×` : ""}{s.necSection && ` · NEC ${s.necSection}`}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {s.frameImage && <img src={s.frameImage} alt={`Check photo for step ${s.order}`} style={{ width: "100%", borderRadius: 8 }} />}
          </li>
        ))}
      </ol>
      <p style={{ marginTop: 24 }}><Link href={pages.workRecord(e.workerId)}>All jobs</Link></p>
    </main>
  );
}
