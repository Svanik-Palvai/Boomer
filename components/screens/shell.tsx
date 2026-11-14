"use client";
// OWNER: Andy (screens). Shared UI primitives ("Labeled panel").
import { useEffect, useRef } from "react";
import s from "./ui.module.css";
import { CloseIcon } from "./Icons";

/** Printed label-maker tape. Yellow = New here. White = a record entry. */
export function Tape({
  tone = "yellow",
  size,
  print = false,
  children,
}: {
  tone?: "yellow" | "white";
  size?: "large" | "hero";
  print?: boolean;
  children: React.ReactNode;
}) {
  const cls = [s.tape, tone === "yellow" ? s.yellow : s.white, size && s[size], print && s.print]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{children}</span>;
}

/** A time that never breaks across lines ("2:41 PM"). */
export function Time({ children }: { children: React.ReactNode }) {
  return <span className={`${s.nowrap} num`}>{children}</span>;
}

export function JobBar({ jobId, place, status }: { jobId: string; place?: string; status?: string }) {
  return (
    <header className={s.jobBar}>
      <span>
        Job <strong className="num">{jobId.replace(/^demo-/, "")}</strong>
        {place && <>, {place}</>}
      </span>
      {status && <span>{status}</span>}
    </header>
  );
}

const FLOW = ["New", "Looking", "Plan ready", "Guiding", "Done"] as const;
export function FlowSteps({ current }: { current: (typeof FLOW)[number] }) {
  const at = FLOW.indexOf(current);
  return (
    <ol className={s.flow} aria-label="Job steps">
      {FLOW.map((name, i) => (
        <li
          key={name}
          className={[s.flowStep, i < at && s.flowDone, i === at && s.flowCurrent].filter(Boolean).join(" ")}
          aria-current={i === at ? "step" : undefined}
        >
          {name}
        </li>
      ))}
    </ol>
  );
}

export function ActionBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className={s.actionBar}>
      <div className={s.actionInner}>
        {note && <p className={s.actionNote}>{note}</p>}
        {children}
      </div>
    </div>
  );
}

/** greenRing = done, but only by the worker saying so (not seen on camera). */
export type MarkKind = "green" | "greenRing" | "ring" | "grey" | "red";
export function StatusMark({ kind, children }: { kind: MarkKind; children: React.ReactNode }) {
  const color = { green: s.markGreen, greenRing: s.markGreen, ring: s.markInk, grey: s.markMuted, red: s.markRed }[
    kind
  ];
  return (
    <span className={`${s.mark} ${color}`}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden focusable="false">
        {kind === "ring" || kind === "greenRing" ? (
          <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        ) : (
          <circle cx="7" cy="7" r="6" fill="currentColor" />
        )}
      </svg>
      {children}
    </span>
  );
}

/** Full-height sheet for anything that needs the keyboard. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // showModal focuses the close button; put the caret in the field instead.
      d.querySelector<HTMLElement>("textarea, input")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={s.sheet} onClose={onClose} aria-label={title}>
      <div className={s.sheetHead}>
        <h2>{title}</h2>
        <button type="button" className={s.iconBtn} onClick={onClose} aria-label="Close">
          <CloseIcon />
        </button>
      </div>
      <div className={s.sheetBody}>{children}</div>
    </dialog>
  );
}

export function Banner({ tone, children }: { tone?: "error"; children: React.ReactNode }) {
  return (
    <p className={`${s.banner} ${tone === "error" ? s.bannerError : ""}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </p>
  );
}
