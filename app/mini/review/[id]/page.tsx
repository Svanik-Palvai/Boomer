"use client";
// OWNER: Teammate 1 (screens). Mini app card for the LOCAL ELECTRICIAN, opened inside iMessage.
import { useMemo, useState } from "react";
import type { CardDecision, PlanStep } from "@/lib/types";
import { useCase } from "@/components/screens/useCase";
import { ActionBar, Banner, Sheet, Tape, Time } from "@/components/screens/shell";
import { ChevronIcon, PencilIcon, PlusIcon } from "@/components/screens/Icons";
import { jobLine, newSteps, place, review, sourceHost, standardSteps, time } from "@/components/screens/caseView";
import m from "../../mini.module.css";

type Draft = { mode: "add" } | { mode: "edit"; step: PlanStep } | { mode: "changes" } | null;

export default function ReviewCard({ params }: { params: { id: string } }) {
  const { data: c, notFound, error, setData } = useCase(params.id, { poll: false });
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(null);
  const [text, setText] = useState("");
  const [showStandard, setShowStandard] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState<{ decision: CardDecision["decision"]; at: string } | null>(null);

  const stepEdits = useMemo<NonNullable<CardDecision["stepEdits"]>>(
    () => [
      ...added.map((t) => ({ action: "add" as const, text: t })),
      ...Object.entries(edited).map(([stepId, t]) => ({ action: "edit" as const, stepId, text: t })),
      ...[...removed].map((stepId) => ({ action: "remove" as const, stepId, text: "" })),
    ],
    [added, edited, removed],
  );

  if (notFound) return <main><h1>This plan isn't available</h1><p className={m.meta}>Ask the worker to send it again.</p></main>;
  if (!c) return <main>{error ? <Banner tone="error">Couldn't load the plan. {error}</Banner> : <p className={m.meta}>Loading the plan…</p>}</main>;

  const town = c.job.site.city;
  const local = review(c, "local");
  const decided = sent ?? (local && local.decision !== "pending" ? { decision: local.decision, at: local.at ?? "" } : null);

  async function send(decision: CardDecision["decision"], note?: string) {
    if (!c) return;
    setSending(true);
    setSendError("");
    const body: CardDecision = {
      caseId: c.id,
      stage: "local",
      decision,
      stepEdits: stepEdits.length ? stepEdits : undefined,
      note: note || undefined,
    };
    try {
      const r = await fetch(`/api/cases/${c.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setSent({ decision, at: new Date().toISOString() });
      setData({ ...c, reviews: c.reviews.map((x) => (x.stage === "local" ? { ...x, decision, at: new Date().toISOString() } : x)) });
      setDraft(null);
    } catch (e) {
      setSendError(`That didn't go through (${e instanceof Error ? e.message : "network error"}). Tap again.`);
    } finally {
      setSending(false);
    }
  }

  if (decided) {
    const confirmed = decided.decision === "confirmed";
    return (
      <main className={m.done}>
        <p className={m.meta}>Case {c.id.replace(/^demo-/, "")}, {place(c)}</p>
        <Tape tone="white" size="large" print={!!sent}>
          {confirmed ? "Local electrician confirmed" : "Changes requested"} <Time>{time(decided.at)}</Time>
        </Tape>
        <p className={m.doneLine}>
          {confirmed ? "The manager gets the plan next." : "The worker gets your note and the plan comes back to you revised."}
        </p>
        {sent && stepEdits.length > 0 && (
          <ul className={m.changeList}>
            {added.map((t) => <li key={t}>You added: {t}</li>)}
            {Object.values(edited).map((t) => <li key={t}>You edited a step: {t}</li>)}
            {removed.size > 0 && <li>You removed {removed.size} step{removed.size > 1 ? "s" : ""}</li>}
          </ul>
        )}
        <p className={m.footnote}>Boomer doesn&apos;t decide compliance. You and the manager do.</p>
      </main>
    );
  }

  const changed = stepEdits.length > 0;
  const openDraft = (d: Draft, initial = "") => {
    setText(initial);
    setDraft(d);
  };
  const saveDraft = () => {
    const t = text.trim();
    if (!draft) return;
    if (draft.mode === "changes") return void send("changes", t);
    if (!t) return;
    if (draft.mode === "add") setAdded((a) => [...a, t]);
    if (draft.mode === "edit") setEdited((e) => ({ ...e, [draft.step.id]: t }));
    setDraft(null);
  };

  const stepRow = (p: PlanStep) => {
    const off = removed.has(p.id);
    return (
      <li key={p.id} className={`${m.row} ${off ? m.rowRemoved : ""}`}>
        <input
          type="checkbox"
          className={m.check}
          checked={!off}
          aria-label={`Keep step ${p.order}`}
          onChange={() =>
            setRemoved((r) => {
              const n = new Set(r);
              if (n.has(p.id)) n.delete(p.id);
              else n.add(p.id);
              return n;
            })
          }
        />
        <div>
          <p className={m.stepText}>
            <span className={`${m.stepNum} num`}>{p.order}</span>
            {edited[p.id] ?? p.text}
          </p>
          {edited[p.id] && <p className={m.edited}>Edited by you</p>}
          {p.sourceUrl && (
            <p className={m.stepMeta}>
              Source: <a href={p.sourceUrl} target="_blank" rel="noreferrer">{sourceHost(p.sourceUrl)}</a>
            </p>
          )}
        </div>
        <button type="button" className={m.iconBtn} aria-label={`Edit step ${p.order}`} onClick={() => openDraft({ mode: "edit", step: p }, edited[p.id] ?? p.text)}>
          <PencilIcon />
        </button>
      </li>
    );
  };

  const fresh = newSteps(c);
  const standard = standardSteps(c);

  return (
    <main>
      <p className={m.meta}>Case {c.id.replace(/^demo-/, "")}, {place(c)}</p>
      <h1 className={m.question}>Is this how you&apos;d do it in {town}?</h1>
      <p className={m.job}>
        {jobLine(c)}. The worker usually works in {c.job.home.city} (NEC {c.job.home.necEdition}).
      </p>

      <section className={m.section} aria-label={`New in ${town}`}>
        <Tape>New in {town}</Tape>
        {fresh.length === 0 && <p className={m.meta}>Boomer found nothing new for this job here.</p>}
        <ul className={m.rows}>
          {fresh.map(stepRow)}
          {added.map((t, i) => (
            <li key={`${t}-${i}`} className={m.row}>
              <input type="checkbox" className={m.check} checked aria-label="Remove added step" onChange={() => setAdded((a) => a.filter((_, j) => j !== i))} />
              <div>
                <p className={m.stepText}>{t}</p>
                <p className={m.edited}>Added by you</p>
              </div>
              <span />
            </li>
          ))}
        </ul>
        <button type="button" className="btn-quiet" onClick={() => openDraft({ mode: "add" })}>
          <PlusIcon /> Add a step
        </button>
      </section>

      {standard.length > 0 && (
        <section className={m.section}>
          <button type="button" className={m.fold} aria-expanded={showStandard} onClick={() => setShowStandard((v) => !v)}>
            <span>
              Their normal install, {standard.length} steps
              <span className={m.foldHint}>Same as at home. Open to check or edit.</span>
            </span>
            <ChevronIcon open={showStandard} />
          </button>
          {showStandard && <ul className={m.rows}>{standard.map(stepRow)}</ul>}
        </section>
      )}

      <p className={m.footnote}>Boomer doesn&apos;t decide compliance. You and the manager do.</p>

      <ActionBar>
        {sendError && <Banner tone="error">{sendError}</Banner>}
        <button type="button" className="btn" disabled={sending} onClick={() => send("confirmed")}>
          {sending ? "Sending…" : changed ? "Confirm with changes" : "Confirm plan"}
        </button>
        <button type="button" className="btn-quiet" style={{ width: "100%" }} disabled={sending} onClick={() => openDraft({ mode: "changes" })}>
          Request changes
        </button>
      </ActionBar>

      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.mode === "add" ? "Add a step" : draft?.mode === "edit" ? `Edit step ${draft.step.order}` : "Request changes"}
      >
        <label>
          <span className={m.meta}>
            {draft?.mode === "changes" ? "What should change? The worker sees this." : "Write it the way you'd tell the worker."}
          </span>
          <textarea

            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={draft?.mode === "add" ? "Test with a GFCI tester before closing up" : undefined}
          />
        </label>
        <button type="button" className="btn" disabled={sending || (draft?.mode !== "changes" && !text.trim())} onClick={saveDraft}>
          {draft?.mode === "changes" ? (sending ? "Sending…" : "Send request") : draft?.mode === "add" ? "Add step" : "Save step"}
        </button>
      </Sheet>
    </main>
  );
}
