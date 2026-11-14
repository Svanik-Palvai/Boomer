"use client";
// OWNER: Teammate 1 (screens). Screen 3: Job plan. Only the New here steps show in full.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlanStep } from "@/lib/types";
import { useCase } from "@/components/screens/useCase";
import { ActionBar, Banner, FlowSteps, JobBar, Tape } from "@/components/screens/shell";
import { ChevronIcon, ExternalIcon } from "@/components/screens/Icons";
import { addedBy, newSteps, place, sortedPlan, sourceHost, standardSteps, statusWord } from "@/components/screens/caseView";
import s from "@/components/screens/screens.module.css";

export default function PlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: c, notFound } = useCase(params.id);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (notFound) return <main><h1>Case not found</h1><Link href="/">Start a new job</Link></main>;
  if (!c) return <main><p className="muted">Loading the plan…</p></main>;

  const town = c.job.site.city;
  const fresh = newSteps(c);
  const standard = standardSteps(c);
  const sent = !["new", "checks_done"].includes(c.status);

  async function send() {
    setSending(true);
    setError("");
    try {
      const r = await fetch(`/api/cases/${params.id}/send`, { method: "POST" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      router.push(`/job/${params.id}/review`);
    } catch (e) {
      setError(`Couldn't send for review (${e instanceof Error ? e.message : "network error"}). Try again.`);
      setSending(false);
    }
  }

  const step = (p: PlanStep, quiet = false) => (
    <li key={p.id} className={`${s.step} ${quiet ? s.quiet : ""}`}>
      <span className={`${s.stepNum} num`}>{p.order}</span>
      <span className={s.stepText}>{p.text}</span>
      {(p.sourceUrl || addedBy(p) || (quiet && p.tag === "new_here")) && (
        <span className={s.stepMeta}>
          {quiet && p.tag === "new_here" && <Tape>New here</Tape>}
          {addedBy(p) && <span>{addedBy(p)}</span>}
          {p.sourceUrl && (
            <a href={p.sourceUrl} target="_blank" rel="noreferrer">
              Source: {sourceHost(p.sourceUrl)} <ExternalIcon />
            </a>
          )}
        </span>
      )}
    </li>
  );

  return (
    <main>
      <JobBar caseId={c.id} place={place(c)} status={statusWord(c)} />
      <FlowSteps current="Plan" />
      <h1 className={s.title}>Job plan</h1>

      <div className={s.compare} aria-label="Code edition, home versus here">
        <span className={s.compareSide}>
          <span className={s.compareTown}>{c.job.home.city}</span>
          <span className={`${s.compareEdition} num`}>NEC {c.job.home.necEdition}</span>
        </span>
        <span className={s.compareArrow} aria-label="to">→</span>
        <span className={s.compareSide}>
          <span className={s.compareTown}>{town}</span>
          <span className={`${s.compareEdition} num`}>NEC {c.job.site.necEdition}</span>
        </span>
      </div>

      {c.plan.length === 0 ? (
        <section className={s.section}>
          <h2>No plan for {town} yet</h2>
          <p className={s.lede}>Boomer builds the plan after the checks for this town finish.</p>
          <Link className="btn" href={`/job/${c.id}/checks`}>Back to checks</Link>
        </section>
      ) : (
        <>
          <section className={s.section} aria-label={`New in ${town}`}>
            <Tape size="large">New in {town}</Tape>
            {fresh.length === 0 ? (
              <p className={s.empty}>Nothing new here. This job follows your normal install.</p>
            ) : (
              <ol className={s.rows} style={{ marginTop: 12 }}>{fresh.map((p) => step(p))}</ol>
            )}
          </section>

          {standard.length > 0 && (
            <section className={s.section}>
              <button type="button" className={s.fold} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                <span>
                  <span className={s.foldTitle}>Your normal install, {standard.length} steps</span>
                  <span className={s.foldHint}>
                    {open ? "Every step in order, new ones marked." : "Same as at home. Tap to see every step in order."}
                  </span>
                </span>
                <ChevronIcon open={open} />
              </button>
              {open && <ol className={s.rows} style={{ borderTop: 0 }}>{sortedPlan(c).map((p) => step(p, true))}</ol>}
            </section>
          )}
        </>
      )}

      {c.plan.length > 0 && (
        <ActionBar>
          {error && <Banner tone="error">{error}</Banner>}
          {sent ? (
            <Link className="btn" href={`/job/${c.id}/review`}>Sent for review. See status</Link>
          ) : (
            <button type="button" className="btn" disabled={sending} onClick={send}>
              {sending ? "Sending to the local electrician…" : "Send for review"}
            </button>
          )}
        </ActionBar>
      )}
    </main>
  );
}
