"use client";
// OWNER: Teammate 1 (screens). Screen 2: Checks. Location confirmation uses Aniketh's picker.
import Link from "next/link";
import { useState } from "react";
import type { Check } from "@/lib/types";
import LocationPicker from "@/components/ar/LocationPicker";
import { useCase } from "@/components/screens/useCase";
import { ActionBar, FlowSteps, JobBar, StatusMark, type MarkKind } from "@/components/screens/shell";
import { ExternalIcon } from "@/components/screens/Icons";
import { place, sourceHost, statusWord } from "@/components/screens/caseView";
import s from "@/components/screens/screens.module.css";

// The order the game plan lists them in.
const ORDER: Check["type"][] = [
  "job_identity", "location", "code_edition", "local_amendments", "rule_difference",
  "permit", "inspection", "license", "parts", "safety",
];
const MARK: Record<Check["status"], { kind: MarkKind; label: string }> = {
  found: { kind: "green", label: "Source found" },
  none_found: { kind: "grey", label: "None found" },
  needs_review: { kind: "ring", label: "Needs review" },
};

function CheckRow({ k, i }: { k: Check; i: number }) {
  const [open, setOpen] = useState(false);
  const mark = k.status === "found" && !k.sourceUrl ? { kind: "green" as const, label: "Found" } : MARK[k.status];
  const long = k.result.length > 90;
  return (
    <li className={s.check} style={{ animationDelay: `${i * 250}ms` }}>
      <span className={s.checkTitle}>{k.title}</span>
      <StatusMark kind={mark.kind}>{mark.label}</StatusMark>
      <span className={s.checkResult}>{open || !long ? k.result : `${k.result.slice(0, 88).trimEnd()}…`}</span>
      {(long || k.sourceUrl) && (
        <button type="button" className={`btn-quiet ${s.checkToggle}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "Less" : "Details and source"}
        </button>
      )}
      {open && k.sourceUrl && (
        <span className={s.checkMore}>
          Source says: <a href={k.sourceUrl} target="_blank" rel="noreferrer">{sourceHost(k.sourceUrl)} <ExternalIcon /></a>
        </span>
      )}
    </li>
  );
}

export default function ChecksPage({ params }: { params: { id: string } }) {
  const { data: c, notFound, reload } = useCase(params.id, { poll: false });

  if (notFound) return <main><h1>Case not found</h1><Link href="/">Start a new job</Link></main>;
  if (!c) return <main><p className="muted">Running the checks…</p></main>;

  const checks = [...c.checks].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  // Only a confirmation from this worker counts (the location route writes "Worker confirmed …").
  const located = c.checks.some((k) => k.type === "location" && k.status === "found" && k.result.startsWith("Worker confirmed"));

  return (
    <main>
      <JobBar caseId={c.id} place={place(c)} status={statusWord(c)} />
      <FlowSteps current="Checks" />
      <h1 className={s.title}>Checks</h1>
      <p className={s.lede}>
        What changes between {c.job.home.city} and {c.job.site.city} for this job. Each result links its source or says needs review.
      </p>

      <div className={s.compare} aria-label="Code edition, home versus here">
        <span className={s.compareSide}>
          <span className={s.compareTown}>{c.job.home.city}</span>
          <span className={`${s.compareEdition} num`}>NEC {c.job.home.necEdition}</span>
        </span>
        <span className={s.compareArrow} aria-label="to">→</span>
        <span className={s.compareSide}>
          <span className={s.compareTown}>{c.job.site.city}</span>
          <span className={`${s.compareEdition} num`}>NEC {c.job.site.necEdition}</span>
        </span>
      </div>

      {!located && (
        <div className={s.picker}>
          <LocationPicker caseId={c.id} onConfirm={() => reload()} />
        </div>
      )}

      <section className={s.section}>
        <h2>{located ? "What Boomer found" : "What Boomer found so far"}</h2>
        <ul className={s.rows}>
          {checks.map((k, i) => <CheckRow key={k.id} k={k} i={i} />)}
        </ul>
      </section>

      <ActionBar note={located ? undefined : "Confirm the job location to see the plan."}>
        {located ? (
          <Link className="btn" href={`/job/${c.id}/plan`}>See job plan</Link>
        ) : (
          <button type="button" className="btn" disabled>See job plan</button>
        )}
      </ActionBar>
    </main>
  );
}
