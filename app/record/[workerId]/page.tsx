"use client";
// OWNER: Andy (screens). Work record: all jobs, totals, share link, and the gap list if built.
import { useState } from "react";
import Link from "next/link";
import type { WorkRecord } from "@/lib/types";
import { usePoll } from "@/components/hooks/useJob";
import { Tape } from "@/components/screens/shell";
import { formatDate } from "@/components/screens/format";
import { api, pages } from "@/lib/routes";
import { RECORD_LABEL, SAFETY_LINE } from "@/lib/copy";
import s from "@/components/screens/record.module.css";

const EXPERIENCE = { new: "New electrician", journeyman: "Journeyman" } as const;

export default function WorkRecordPage({ params }: { params: { workerId: string } }) {
  const { data: rec, notFound } = usePoll<WorkRecord>(api.record(params.workerId), { intervalMs: 5000 });

  if (notFound)
    return (
      <main>
        <h1>No record for {params.workerId}</h1>
      </main>
    );
  if (!rec)
    return (
      <main>
        <p className="muted">Loading the record…</p>
      </main>
    );

  const { worker, entries, totals } = rec;
  // Job types are ids ("gfci-swap"); show the title of a job of that type instead.
  const typeName = (t: string) => entries.find((e) => e.jobType === t)?.title ?? t;
  const tally = (m: Record<string, number>, name = (k: string) => k) =>
    Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${name(k)} (${v})`)
      .join(", ");

  return (
    <main>
      <h1 className={s.title}>{worker.name}</h1>
      <p className={s.place}>
        {EXPERIENCE[worker.experience]} from {worker.home.city}, {worker.home.state}
      </p>
      <p className={s.stamp}>
        <Tape tone="white" print>
          {RECORD_LABEL}
        </Tape>
      </p>

      <dl className={s.facts}>
        <dt>Jobs</dt>
        <dd className="num">{totals.jobs}</dd>
        <dt>States</dt>
        <dd>{tally(totals.byState) || "None yet"}</dd>
        <dt>Job types</dt>
        <dd>{tally(totals.byJobType, typeName) || "None yet"}</dd>
      </dl>

      <ShareLink url={rec.shareUrl} />

      {!!rec.skills?.length && (
        <>
          <h2 className={s.h2}>Skills</h2>
          <p className={s.skillNote}>
            Boomer&rsquo;s estimate that {worker.name.split(" ")[0]} has each skill down, updated by every step check. An
            estimate from observed work, not a qualification.
          </p>
          <ul className={s.skills}>
            {rec.skills.map((k) => (
              <li key={k.skill} className={s.skill}>
                <span className={s.skillName}>{k.label}</span>
                <span className={`${s.skillPct} num`}>{Math.round(k.p * 100)}%</span>
                <span
                  className={s.meter}
                  role="meter"
                  aria-label={`${k.label} estimate`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(k.p * 100)}
                >
                  <span className={s.meterFill} data-level={k.level} style={{ width: `${Math.round(k.p * 100)}%` }} />
                </span>
                <span className={`${s.skillMeta} num`}>
                  {k.right} of {k.checks} {k.checks === 1 ? "check" : "checks"} right · {k.seen} seen on camera
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={s.h2}>Jobs</h2>
      <ul className={s.jobs}>
        {entries.length === 0 && <li className={s.empty}>No finished jobs yet. Each guided call adds one here.</li>}
        {[...entries]
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => (
            <li key={e.id} className={s.job}>
              <Link href={pages.jobRecord(e.jobId)} className={s.jobLink}>
                <span className={s.jobTitle}>{e.title}</span>
                <span className={s.jobMeta}>
                  {formatDate(e.date)} · {e.city}, {e.state} · {e.codeEdition} NEC
                  {e.outcome === "stopped" && " · stopped"}
                </span>
                <span className={`${s.jobCounts} num`}>
                  {e.counts.done}/{e.counts.total} steps · {e.counts.seen} seen on camera
                  {e.counts.corrected > 0 && ` · ${e.counts.corrected} corrected`}
                  {e.counts.newHere > 0 && ` · ${e.counts.newHere} new here`}
                </span>
              </Link>
            </li>
          ))}
      </ul>

      <p className={s.fine}>{SAFETY_LINE}</p>
    </main>
  );
}

function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.share) await navigator.share({ title: "My work record", url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share sheet dismissed
    }
  }
  return (
    <div className={s.share}>
      <span className={s.shareUrl}>{url.replace(/^https?:\/\//, "")}</span>
      <button className="btn" type="button" onClick={copy}>
        {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}
