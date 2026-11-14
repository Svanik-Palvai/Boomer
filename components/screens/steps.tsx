// OWNER: Andy (screens). The step list, drawn like a panel directory: one ruled row per step.
// Used by the live job view (laptop) and the job record (iMessage link).
import type { StepStatus, StepTag } from "@/lib/types";
import { StatusMark, Tape, type MarkKind } from "./shell";
import { ExternalIcon } from "./Icons";
import s from "./steps.module.css";

export interface StepRowData {
  order: number;
  text: string;
  tag: StepTag;
  status: StepStatus;
  fails: number;
  necSection?: string;
  sourceUrl?: string;
  ruleVerified?: boolean;
  /** Image of the frame the passing check used. */
  thumb?: string;
  /** Checked by the worker saying so, not from a frame. */
  spoken?: boolean;
}

const RESULT: Record<StepStatus, { kind: MarkKind; text: string } | null> = {
  seen: { kind: "green", text: "Looks right, seen on camera" },
  worker_confirmed: { kind: "greenRing", text: "Worker confirmed, not seen" },
  not_yet: { kind: "red", text: "Not yet" },
  pending: null,
};

export function StepRow({
  step,
  current = false,
  size = "live",
}: {
  step: StepRowData;
  current?: boolean;
  size?: "live" | "record";
}) {
  const result = RESULT[step.status];
  const done = step.status === "seen" || step.status === "worker_confirmed";
  const cls = [
    s.row,
    size === "record" && s.record,
    current && s.current,
    !done && !current && step.status === "pending" && s.ahead,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={cls} aria-current={current ? "step" : undefined} data-current-step={current || undefined}>
      <span className={`${s.num} num`}>{step.order}</span>
      <div className={s.body}>
        <p className={s.text}>
          {step.tag === "new_here" && (
            <>
              <Tape>New here</Tape>{" "}
            </>
          )}
          {step.text}
        </p>
        <div className={s.meta}>
          {current && step.status === "pending" && <StatusMark kind="ring">Now</StatusMark>}
          {result && <StatusMark kind={result.kind}>{result.text}</StatusMark>}
          {done && step.fails > 0 && (
            <span className={s.fails}>
              Corrected after <span className="num">{step.fails}</span> not yet
            </span>
          )}
          {step.status === "not_yet" && step.fails > 1 && (
            <span className={s.fails}>
              <span className="num">{step.fails}</span> tries so far
            </span>
          )}
          {step.tag === "new_here" && step.necSection && (
            <span>
              {step.sourceUrl && step.ruleVerified !== false ? (
                <a href={step.sourceUrl} target="_blank" rel="noreferrer">
                  NEC {step.necSection} <ExternalIcon size={14} />
                </a>
              ) : (
                <>NEC {step.necSection}</>
              )}
              {step.ruleVerified === false && <span className={s.unverified}> · rule not checked yet</span>}
            </span>
          )}
        </div>
      </div>
      {step.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.thumb} src={step.thumb} alt={`Frame Boomer checked for step ${step.order}`} />
      ) : (
        // Spoken checks never have a photo, so no empty frame waiting for one.
        <span className={`${s.thumbEmpty} ${step.spoken ? s.thumbNone : ""}`} aria-hidden />
      )}
    </li>
  );
}

export function StepList({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <ol className={s.list} aria-label={label}>
      {children}
    </ol>
  );
}
