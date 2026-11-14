"use client";
// OWNER: Teammate 1 (screens). Mini app card for the MANAGER, opened inside iMessage.
// This is the card the judge taps in the demo.
import { useState } from "react";
import type { CardDecision } from "@/lib/types";
import { useCase } from "@/components/screens/useCase";
import { ActionBar, Banner, Sheet, StatusMark, Tape, Time } from "@/components/screens/shell";
import { CheckIcon } from "@/components/screens/Icons";
import { isApproved, jobLine, newSteps, place, review, time } from "@/components/screens/caseView";
import m from "../../mini.module.css";

export default function ApproveCard({ params }: { params: { id: string } }) {
  const { data: c, notFound, error, setData } = useCase(params.id);
  const [optimistic, setOptimistic] = useState<{ at: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");

  if (notFound) return <main><h1>This plan isn&apos;t available</h1><p className={m.meta}>Ask the worker to send it again.</p></main>;
  if (!c) return <main>{error ? <Banner tone="error">Couldn&apos;t load the plan. {error}</Banner> : <p className={m.meta}>Loading the plan…</p>}</main>;

  const town = c.job.site.city;
  const local = review(c, "local");
  const manager = review(c, "manager");
  const localConfirmed = local?.decision === "confirmed";
  const approvedAt = optimistic?.at ?? (manager?.decision === "approved" ? manager.at : undefined);
  const approved = !!optimistic || (isApproved(c) && manager?.decision === "approved");
  const fresh = newSteps(c);
  const added = c.plan.filter((p) => p.addedBy === "local_reviewer");

  async function decide(decision: CardDecision["decision"], text?: string) {
    if (!c) return;
    const at = new Date().toISOString();
    setSending(true);
    setSendError("");
    if (decision === "approved") setOptimistic({ at }); // print the tape on tap, confirm after
    try {
      const body: CardDecision = { caseId: c.id, stage: "manager", decision, note: text || undefined };
      const r = await fetch(`/api/cases/${c.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      const { status } = (await r.json()) as { status: typeof c.status };
      setData({ ...c, status, reviews: c.reviews.map((x) => (x.stage === "manager" ? { ...x, decision, at } : x)) });
      setAsking(false);
    } catch {
      setOptimistic(null);
      setSendError(decision === "approved" ? "Approval didn't go through. Tap Approve again." : "Your note didn't go through. Try again.");
    } finally {
      setSending(false);
    }
  }

  const header = <p className={m.meta}>Case {c.id.replace(/^demo-/, "")}, {place(c)}</p>;

  // After approval: the same card shows the worker's progress through the New here steps.
  if (approved) {
    const done = new Set(c.arProgress ?? []);
    const doneCount = fresh.filter((p) => done.has(p.id)).length;
    const current = fresh.find((p) => !done.has(p.id));
    const allDone = fresh.length > 0 && doneCount === fresh.length;
    return (
      <main className={m.done}>
        {header}
        <Tape tone="white" size="hero" print={!!optimistic}>
          Manager approved
          <small className="num">{time(approvedAt)}</small>
        </Tape>
        <section className={m.progress} aria-live="polite">
          <p className={m.progressHead}>
            {allDone
              ? `All new steps done ${time(c.updatedAt)}`
              : fresh.length === 0
                ? "Nothing new to guide here"
                : doneCount === 0
                  ? "The AR guide is unlocked on the worker's phone"
                  : `Worker is on step ${doneCount + 1} of ${fresh.length}`}
          </p>
          <ul className={m.rows}>
            {fresh.map((p) => {
              const isDone = done.has(p.id);
              const isNow = current?.id === p.id;
              return (
                <li key={p.id} className={m.progressRow}>
                  <span className={`${m.tick} ${isDone ? m.tickDone : isNow ? m.tickNow : ""}`} aria-hidden>
                    {isDone && <CheckIcon size={16} />}
                  </span>
                  <span className={m.stepText}>
                    {p.text}
                    <span className="visually-hidden">{isDone ? ", done" : isNow ? ", in progress" : ", not started"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    );
  }

  if (manager?.decision === "rejected") {
    return (
      <main className={m.done}>
        {header}
        <Tape tone="white" size="large">You asked for a change <Time>{time(manager.at)}</Time></Tape>
        <p className={m.doneLine}>The worker and the local electrician have your note. You&apos;ll get the revised plan here.</p>
      </main>
    );
  }

  return (
    <main>
      {header}
      <h1 className={m.question}>Approve this plan?</h1>
      <p className={m.job}>{jobLine(c)}.</p>

      <section className={m.summary}>
        <p>
          <Tape>New in {town}</Tape> <span className="num">{fresh.length}</span> step{fresh.length === 1 ? "" : "s"}
        </p>
        <ul className={m.rows}>
          {fresh.map((p) => (
            <li key={p.id} className={m.progressRow} style={{ gridTemplateColumns: "28px 1fr" }}>
              <span className={`${m.stepNum} num`}>{p.order}</span>
              <span className={m.stepText}>{p.text}</span>
            </li>
          ))}
        </ul>
        <div className={m.confirmLine}>
          {localConfirmed ? (
            <StatusMark kind="green">Local electrician confirmed <Time>{time(local?.at)}</Time></StatusMark>
          ) : (
            <StatusMark kind="ring">Waiting for the local electrician</StatusMark>
          )}
          {added.length > 0 && (
            <ul className={m.addedList}>
              {added.map((p) => <li key={p.id}>Added: {p.text}</li>)}
            </ul>
          )}
        </div>
      </section>

      <ActionBar note={localConfirmed ? undefined : "You can approve once the local electrician confirms."}>
        {sendError && <Banner tone="error">{sendError}</Banner>}
        <button type="button" className="btn" disabled={!localConfirmed || sending} onClick={() => decide("approved")}>
          Approve plan
        </button>
        <button type="button" className="btn-quiet" style={{ width: "100%" }} disabled={sending} onClick={() => setAsking(true)}>
          Request a change
        </button>
      </ActionBar>

      <Sheet open={asking} onClose={() => setAsking(false)} title="Request a change">
        <label>
          <span className={m.meta}>What should change? The worker and local electrician see this.</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className="btn" disabled={sending || !note.trim()} onClick={() => decide("rejected", note.trim())}>
          {sending ? "Sending…" : "Send request"}
        </button>
      </Sheet>
    </main>
  );
}
