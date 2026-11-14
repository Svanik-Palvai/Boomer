"use client";
// OWNER: Andy (screens). "Show me": a frozen photo with the part for the current step marked on it.
// A still photo on purpose: live AR was cut from the plan, a photo can be marked reliably.
// The label lives under the photo, never on it: it must not cover the device marking the worker has to check.
import { useEffect, useState } from "react";
import { Tape } from "@/components/screens/shell";
import { locate, type LocateResult } from "./locate";
import s from "./showme.module.css";

export function ShowMe({
  image,
  workerId,
  jobId,
  stepId,
  stepNumber,
  onRetake,
  onClose,
}: {
  image: string;
  workerId: string;
  jobId?: string;
  stepId?: string;
  stepNumber: number | null;
  onRetake: () => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LocateResult | null>(null);

  useEffect(() => {
    let alive = true;
    setResult(null);
    locate({ workerId, jobId, stepId, image }).then((r) => alive && setResult(r));
    return () => {
      alive = false;
    };
  }, [image, workerId, jobId, stepId]);

  const box = result?.found ? result.box : undefined;

  return (
    <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Show me">
      <div className={s.photoArea}>
        <div className={`${s.frame} ${!result ? s.busy : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={stepNumber ? `Photo for step ${stepNumber}` : "Photo of the work"} />
          {box && result && (
            <div
              className={s.mark}
              role="img"
              aria-label={`Marked: ${result.label}`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className={s.panel}>
        <p className={s.say} role="status" aria-live="polite">
          {result?.found && (
            <>
              <Tape>{result.label}</Tape>{" "}
            </>
          )}
          {result ? result.say : "Finding it…"}
        </p>
        {result?.found && result.source === "fallback" && (
          <p className={s.note}>Sample mark for the demo. The photo lookup isn&rsquo;t connected yet.</p>
        )}
        <div className={s.actions}>
          <button className="btn" type="button" onClick={onClose}>
            Back to live camera
          </button>
          <button className="btn-quiet" type="button" onClick={onRetake}>
            Take another photo
          </button>
        </div>
      </div>
    </div>
  );
}
