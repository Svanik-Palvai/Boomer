"use client";
// OWNER: Andy (screens). One finished job: every step, its check photo and its result.
// Opened from the iMessage link on the worker's phone, and forwarded to employers.
import Link from "next/link";
import type { RecordEntry } from "@/lib/types";
import { usePoll } from "@/components/hooks/useJob";
import { Tape } from "@/components/screens/shell";
import { StepList, StepRow } from "@/components/screens/steps";
import { api, pages } from "@/lib/routes";
import { RECORD_LABEL, SAFETY_LINE } from "@/lib/copy";
import { formatDate } from "@/components/screens/format";
import s from "@/components/screens/record.module.css";

export default function JobRecordPage({ params }: { params: { id: string } }) {
  const { data: e, notFound } = usePoll<RecordEntry>(api.jobRecord(params.id), { intervalMs: 3000 });

  if (notFound)
    return (
      <main>
        <h1>Not finished yet</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          The record appears here when the job ends. This page checks every few seconds.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link href={pages.liveJob(params.id)}>Watch the job live</Link>
        </p>
      </main>
    );
  if (!e)
    return (
      <main>
        <p className="muted">Loading the record…</p>
      </main>
    );

  const c = e.counts;
  return (
    <main>
      <h1 className={s.title}>{e.title}</h1>
      <p className={s.place}>
        <strong>
          {e.city}, {e.state}
        </strong>{" "}
        · {e.codeEdition} NEC · {formatDate(e.date)} · <span className="num">{e.minutes}</span> min
      </p>
      <p className={s.stamp}>
        <Tape tone="white" print>
          {RECORD_LABEL}
        </Tape>
      </p>

      <p className={s.summary}>
        {e.outcome === "stopped" ? "Stopped after " : ""}
        <span className="num">{c.done}</span> of <span className="num">{c.total}</span> steps done.{" "}
        <span className="num">{c.seen}</span> seen on camera, <span className="num">{c.workerConfirmed}</span> worker
        confirmed
        {c.corrected > 0 && (
          <>
            , <span className="num">{c.corrected}</span> corrected along the way
          </>
        )}
        .
        {c.newHere > 0 && (
          <>
            {" "}
            <span className="num">{c.newHere}</span> {c.newHere === 1 ? "step was" : "steps were"} new for this state.
          </>
        )}
      </p>
      {e.summary && <p className={s.note}>{e.summary}</p>}

      <StepList label="Steps">
        {e.steps.map((st) => (
          <StepRow key={st.order} size="record" step={{ ...st, thumb: st.frameImage, spoken: !st.frameImage }} />
        ))}
      </StepList>

      <p className={s.fine}>{SAFETY_LINE}</p>
      <p className={s.links}>
        <Link href={pages.workRecord(e.workerId)}>All jobs in this record</Link>
      </p>
    </main>
  );
}
