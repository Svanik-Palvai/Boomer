"use client";
// OWNER: Teammate 1 (screens). Screen 4: Review status. Polls the case every 2s.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Case, MemoryEvent, Message, Stage } from "@/lib/types";
import { useCase } from "@/components/screens/useCase";
import { ActionBar, Banner, FlowSteps, JobBar, StatusMark, Tape, Time, type MarkKind } from "@/components/screens/shell";
import { AppIcon, LockIcon, MessageIcon, PhoneIcon, TapIcon } from "@/components/screens/Icons";
import { isApproved, place, review, statusWord, time } from "@/components/screens/caseView";
import s from "@/components/screens/screens.module.css";

const WHO: Record<MemoryEvent["speaker"], string> = {
  worker: "Worker",
  local_reviewer: "Local electrician",
  manager: "Manager",
  agent: "Boomer",
};

type Item = { id: string; at: string; channel: MemoryEvent["channel"]; who: string; text: string };

/** Card taps are stored as "confirmed (1 step edits)"; say what happened instead. */
function readable(e: MemoryEvent) {
  if (e.channel !== "mini_app") return e.text;
  const m = e.text.match(/^(confirmed|changes|approved|rejected)(?::\s*([^()]*))?(?:\s*\((\d+) step edits?\))?/);
  if (!m) return e.text;
  const verb = { confirmed: "Confirmed the plan", changes: "Asked for changes", approved: "Approved the plan", rejected: "Asked for a change" }[
    m[1] as "confirmed"
  ];
  const edits = m[3] ? ` with ${m[3]} step change${m[3] === "1" ? "" : "s"}` : "";
  const note = m[2]?.trim() ? `: "${m[2].trim()}"` : "";
  return `${verb}${edits}${note}`;
}

function timeline(c: Case): Item[] {
  const mem: Item[] = (c.memory ?? []).map((e) => ({
    id: e.id,
    at: e.at,
    channel: e.channel,
    who: WHO[e.speaker],
    text: readable(e),
  }));
  const msgs: Item[] = c.messages.map((m: Message) => ({
    id: m.id,
    at: m.at,
    channel: "imessage" as const,
    who: m.direction === "out" ? `Boomer to ${m.stage === "local" ? "local electrician" : "manager"}` : m.from,
    text: m.body,
  }));
  return [...mem, ...msgs].sort((a, b) => b.at.localeCompare(a.at));
}

const CHANNEL = {
  imessage: { label: "Text", Icon: MessageIcon },
  voice: { label: "Call", Icon: PhoneIcon },
  mini_app: { label: "Card tap", Icon: TapIcon },
  app: { label: "App", Icon: AppIcon },
} as const;

const STAGE_WORD = {
  pending: "Waiting",
  confirmed: "Confirmed",
  approved: "Approved",
  changes: "Changes requested",
  rejected: "Asked for a change",
} as const;

function stageMark(c: Case, stage: Stage): MarkKind {
  const d = review(c, stage)?.decision;
  if (d === "confirmed" || d === "approved") return "green";
  if (d === "changes" || d === "rejected") return "red";
  return "ring";
}

export default function ReviewPage({ params }: { params: { id: string } }) {
  const { data: c, notFound, stale } = useCase(params.id);
  const prevApproved = useRef<boolean | null>(null);
  const [justApproved, setJustApproved] = useState(false);

  // Print the approval label only when it happens while this screen is open.
  const approvedNow = c ? isApproved(c) : false;
  useEffect(() => {
    if (!c) return;
    if (prevApproved.current === false && approvedNow) setJustApproved(true);
    prevApproved.current = approvedNow;
  }, [c, approvedNow]);

  if (notFound) return <main><h1>Case not found</h1><Link href="/">Start a new job</Link></main>;
  if (!c) return <main><p className="muted">Loading the review…</p></main>;

  const manager = review(c, "manager");
  const local = review(c, "local");
  const addedByLocal = c.plan.filter((p) => p.addedBy === "local_reviewer");
  const items = timeline(c);
  const sentYet = c.status !== "new" && c.status !== "checks_done";

  return (
    <main>
      <JobBar caseId={c.id} place={place(c)} status={statusWord(c)} />
      <FlowSteps current="Review" />
      <h1 className={s.title}>Review status</h1>
      <p className={s.lede}>
        {sentYet ? "The plan goes to a local electrician first, then your manager." : "This plan hasn't been sent yet."}
      </p>

      {stale && <Banner>Live updates paused. Retrying…</Banner>}

      <div aria-live="polite">
        {approvedNow && (
          <div className={s.approvedTape}>
            <Tape tone="white" size="large" print={justApproved}>
              Manager approved <Time>{time(manager?.at)}</Time>
            </Tape>
          </div>
        )}
        <ol className={s.tracker} aria-label="Sign-off stages">
          {(["local", "manager"] as const).map((stage) => {
            const r = review(c, stage);
            return (
              <li key={stage} className={s.stage}>
                <span className={s.stageName}>{stage === "local" ? "Local electrician" : "Manager"}</span>
                <StatusMark kind={stageMark(c, stage)}>
                  {STAGE_WORD[r?.decision ?? "pending"]}
                  {r?.at && r.decision !== "pending" && <> <Time>{time(r.at)}</Time></>}
                </StatusMark>
                {stage === "local" && local?.decision !== "pending" && addedByLocal.length > 0 && (
                  <span className={s.stageNote}>
                    Added {addedByLocal.length} step{addedByLocal.length === 1 ? "" : "s"}: {addedByLocal.map((p) => p.text).join("; ")}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <section className={s.section}>
        <h2>What&apos;s been said</h2>
        <ul className={s.rows}>
          {items.length === 0 && <li className={s.empty}>Texts, card taps and call summaries show up here as they happen.</li>}
          {items.map((it) => {
            const ch = CHANNEL[it.channel];
            return (
              <li key={it.id} className={s.item}>
                <span className={s.itemIcon}><ch.Icon /></span>
                <span className={s.itemHead}>
                  {ch.label}, <Time>{time(it.at)}</Time>, <strong>{it.who}</strong>
                </span>
                <span className={s.itemText}>{it.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        type="button"
        className={`btn-quiet ${s.reset}`}
        onClick={async () => {
          if (!confirm("Reset the demo case? This clears all reviews and messages.")) return;
          await fetch(`/api/cases/${c.id}/reset`, { method: "POST" });
          location.href = `/job/${c.id}/checks`;
        }}
      >
        Reset demo
      </button>

      <ActionBar note={approvedNow ? undefined : "The AR guide unlocks when the manager approves."}>
        {approvedNow ? (
          <Link className="btn" href={`/job/${c.id}/guide`}>Open AR guide</Link>
        ) : (
          <button type="button" className="btn" aria-disabled="true" disabled>
            <LockIcon /> AR guide locked
          </button>
        )}
      </ActionBar>
    </main>
  );
}
