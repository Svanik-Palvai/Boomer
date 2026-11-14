"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Case } from "@/lib/types";
import { guideSteps, guideUnlocked } from "@/lib/checks/guide";
import overlays from "@/data/arSteps.json";
import LocationPicker from "./LocationPicker";
import styles from "./Guide.module.css";
export default function Guide({ caseId }: { caseId: string }) {
  const [c, setCase] = useState<Case>();
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [photo, setPhoto] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream>();
  const mounted = useRef(true);
  const starting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    async function refresh() {
      try {
        const r = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, {
          cache: "no-store",
        });
        if (!r.ok)
          throw new Error(
            r.status === 404 ? "Case not found" : "Cannot load case",
          );
        const data = await r.json();
        if (active) {
          setCase(data);
          setError("");
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Cannot load case");
      }
    }
    void refresh();
    const timer = setInterval(refresh, 2000);
    return () => {
      active = false;
      mounted.current = false;
      clearInterval(timer);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [caseId]);
  useEffect(() => {
    if (video.current && live) {
      video.current.srcObject = stream.current || null;
      void video.current
        .play()
        .catch(() => setCameraError("Tap Enable camera to retry playback."));
    }
  }, [live, c]);
  useEffect(
    () => () => {
      if (photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  useEffect(() => {
    if (c && !guideUnlocked(c)) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setLive(false);
    }
  }, [c]);
  async function start() {
    if (starting.current) return;
    starting.current = true;
    setCameraError("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Camera requires HTTPS and browser permission. Use a photo below.",
        );
      stream.current?.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mounted.current) {
        s.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = s;
      setLive(true);
    } catch (e) {
      setLive(false);
      setCameraError(
        e instanceof Error ? e.message : "Camera unavailable. Use a photo.",
      );
    } finally {
      starting.current = false;
    }
  }
  async function next() {
    if (!c) return;
    const step = guideSteps(c).find((s) => !c.arProgress?.includes(s.id));
    if (!step) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/job/${encodeURIComponent(caseId)}/guide/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stepId: step.id }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setCase(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Progress was not saved. Retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!c)
    return (
      <main>
        <h1>Step guide</h1>
        <p role="status">{error || "Loading case…"}</p>
        <Link href="/">Back to job</Link>
      </main>
    );
  const steps = guideSteps(c),
    completed = steps.filter((s) => c.arProgress?.includes(s.id)).length,
    step = steps.find((s) => !c.arProgress?.includes(s.id));
  const overlay = overlays.find((o) => o.id === step?.arStepId);
  const unlocked = guideUnlocked(c);
  return (
    <main className={styles.controls}>
      <Link href={`/job/${encodeURIComponent(caseId)}/review`}>
        ← Review status
      </Link>
      <p className={styles.badge}>Boomer · field guide</p>
      <h1>Only what’s new here</h1>
      <p>
        {c.job.site.city}, {c.job.site.state} · {c.job.component}
      </p>
      <p>
        Pre-positioned demo overlay. Keep the worker phone on its stand, aligned
        with the inert outlet prop. No live wiring.
      </p>
      <LocationPicker
        caseId={caseId}
        onConfirm={(town) =>
          setCameraError(
            `Location saved: ${town.city}, ${town.state}. If the jurisdiction changed, the prior plan and sign-offs are cleared. Return to checks for a new plan.`,
          )
        }
      />
      {!unlocked ? (
        <div className="card">
          <h2>Waiting for sign-off</h2>
          <p>
            A local electrician must confirm and the manager must approve this
            plan. This screen updates automatically.
          </p>
        </div>
      ) : (
        <>
          <progress
            className={styles.progress}
            value={completed}
            max={Math.max(steps.length, 1)}
            aria-label="Completed new steps"
          />
          <p aria-live="polite">
            {completed} of {steps.length} new steps recorded
          </p>
          <div className={styles.stage}>
            {live ? (
              <video
                className={styles.video}
                ref={video}
                muted
                playsInline
                autoPlay
              />
            ) : photo || c.job.photoUrl ? (
              <img
                className={styles.photo}
                src={photo || c.job.photoUrl}
                alt="Job reference for fixed overlay"
              />
            ) : (
              <div className={styles.empty}>
                Enable the camera or choose a reference photo. Align the outlet
                inside the highlighted area.
              </div>
            )}
            {step && overlay && (
              <div
                className={styles.target}
                style={{
                  left: `${overlay.x * 100}%`,
                  top: `${overlay.y * 100}%`,
                  width: `${overlay.w * 100}%`,
                  height: `${overlay.h * 100}%`,
                }}
              >
                <span>↓ {overlay.label}</span>
              </div>
            )}
          </div>
          <button className="btn" onClick={start}>
            Enable / retry camera
          </button>
          {live && (
            <button
              className="btn"
              onClick={() => {
                stream.current?.getTracks().forEach((t) => t.stop());
                setLive(false);
              }}
            >
              Stop camera
            </button>
          )}
          <label className={styles.file}>
            Still-photo fallback
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.type.startsWith("image/")) {
                  if (f.size > 15 * 1024 * 1024) {
                    setCameraError("Choose an image under 15 MB.");
                    return;
                  }
                  setPhoto(URL.createObjectURL(f));
                  stream.current?.getTracks().forEach((t) => t.stop());
                  setLive(false);
                }
              }}
            />
          </label>
          {step ? (
            <article className="card">
              <p className={styles.badge}>New here · step {completed + 1}</p>
              <h2>{step.text}</h2>
              {!overlay && (
                <p>
                  Reviewer-added step: read the instruction; no positioned
                  overlay is assigned.
                </p>
              )}
              {step.sourceUrl && (
                <a
                  className={styles.source}
                  href={step.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source
                </a>
              )}
              <button className="btn" disabled={busy || !!error} onClick={next}>
                {busy ? "Saving…" : "Mark complete · Next"}
              </button>
            </article>
          ) : (
            <div className="card">
              <h2>{steps.length ? "Guide complete" : "No New here steps"}</h2>
              <p>
                {steps.length
                  ? "Progress saved to the shared case."
                  : "The plan has no new steps to guide. Follow the human-reviewed plan."}
              </p>
              <Link href="/playbook">Open playbook</Link>
            </div>
          )}
          <details>
            <summary>Standard work · follow your normal procedure</summary>
            {c.plan
              .filter((s) => s.tag === "standard")
              .map((s) => (
                <p key={s.id}>{s.text}</p>
              ))}
          </details>
        </>
      )}
      <p role="alert" className={styles.error}>
        {error || cameraError}
      </p>
      <p>
        AI builds and routes the plan. Licensed humans confirm and approve it.
      </p>
    </main>
  );
}
