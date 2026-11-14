"use client";
// OWNER: Lessons feature. Opt-in recording reuses a clone of camera video tracks, never microphone.
import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { lessonRequest } from "@/lib/lessons/client";
import {
  localSessions,
  readChunk,
  removeLocal,
  saveChunk,
  saveLocal,
  type LocalRecording,
} from "./localMedia";
export function recordingType() {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    ["video/mp4", "video/webm;codecs=vp8", "video/webm"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    ) ?? null
  );
}
export default function LessonRecorder({
  jobId,
  jobStatus,
  videoRef,
}: {
  workerId: string;
  jobId?: string;
  jobStatus?: string;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const controls = useRef<HTMLDetailsElement>(null);
  const epoch = useRef(0);
  const [consent, setConsent] = useState(false),
    [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState<LocalRecording[]>([]);
  const clonedTracks = useRef<MediaStreamTrack[]>([]);
  const recorder = useRef<MediaRecorder>(),
    current = useRef<LocalRecording>(),
    mounted = useRef(true);
  const operation = useRef(false);
  async function refresh() {
    const token = epoch.current;
    const all = await localSessions();
    if (mounted.current && token === epoch.current)
      setSaved(all.filter((s) => s.jobId === jobId));
  }
  useEffect(() => {
    mounted.current = true;
    operation.current = false;
    setActive(false);
    setBusy(false);
    setConsent(false);
    void refresh().catch(() =>
      setMessage("Local recording storage unavailable. Guidance can continue."),
    );
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (recorder.current?.state === "recording") {
        current.current?.interruptions.push("Page hidden during recording");
        recorder.current.stop();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      mounted.current = false;
      epoch.current++;
      document.removeEventListener("visibilitychange", onHide);
      if (recorder.current?.state === "recording") {
        current.current?.interruptions.push("Camera page closed");
        recorder.current.stop();
      }
    };
  }, [jobId]);
  useEffect(() => {
    if (
      (jobStatus === "done" || jobStatus === "stopped") &&
      recorder.current?.state === "recording"
    )
      recorder.current.stop();
  }, [jobStatus]);
  async function start() {
    if (operation.current || recorder.current?.state === "recording") return;
    operation.current = true;
    const generation = epoch.current;
    let persistence = Promise.resolve();
    let localFailed = false;
    setBusy(true);
    setMessage("");
    try {
      if (jobStatus === "done" || jobStatus === "stopped")
        throw new Error(
          "Open a new job before recording; completed work cannot be recorded retroactively.",
        );
      if (!jobId || !consent)
        throw new Error("Consent and an active job are required.");
      const stream = videoRef.current?.srcObject;
      if (!(stream instanceof MediaStream))
        throw new Error("Start the camera first.");
      const mime = recordingType();
      if (!mime)
        throw new Error(
          "This browser cannot record video. Use a supported recording device; still checks can continue.",
        );
      await lessonRequest(`jobs/${jobId}`, { consent: true });
      const s: LocalRecording = {
        id: crypto.randomUUID(),
        lessonId: `lesson-${jobId}`,
        jobId,
        mime: mime.startsWith("video/mp4") ? "video/mp4" : "video/webm",
        startedAt: new Date().toISOString(),
        count: 0,
        interruptions: [],
      };
      await lessonRequest(`drafts/${s.lessonId}/session`, {
        sessionId: s.id,
        mime: s.mime,
        startedAt: s.startedAt,
      });
      await saveLocal(s);
      if (!mounted.current || generation !== epoch.current) return;
      current.current = s;
      const tracks = stream.getVideoTracks().map((t) => t.clone());
      clonedTracks.current = tracks;
      const rec = new MediaRecorder(new MediaStream(tracks), {
        mimeType: mime,
        videoBitsPerSecond: 1200000,
      });
      recorder.current = rec;
      const interrupted = () => {
        s.interruptions.push("Camera track muted or ended during recording");
        if (rec.state === "recording") rec.stop();
      };
      tracks.forEach((t) => {
        t.addEventListener("mute", interrupted);
        t.addEventListener("ended", interrupted);
      });
      rec.ondataavailable = (e) => {
        if (!e.data.size) return;
        const i = s.count++;
        persistence = persistence
          .then(async () => {
            await saveChunk(s.id, i, e.data);
            await saveLocal({ ...s });
          })
          .catch(() => {
            localFailed = true;
            s.interruptions.push("Local chunk write failed");
            if (rec.state === "recording") rec.stop();
            if (mounted.current)
              setMessage(
                "Recording storage failed. Saved chunks remain; guidance is unaffected.",
              );
          });
      };
      rec.onerror = () => {
        s.interruptions.push("Recorder error");
        if (mounted.current)
          setMessage("Recording interrupted; guidance can continue.");
      };
      const started = performance.now();
      const limit = setTimeout(() => {
        s.interruptions.push("15-minute demo recording limit reached");
        if (rec.state === "recording") rec.stop();
      }, 900000);
      rec.onstop = async () => {
        clearTimeout(limit);
        tracks.forEach((t) => {
          t.removeEventListener("mute", interrupted);
          t.removeEventListener("ended", interrupted);
          t.stop();
        });
        s.endedAt = new Date().toISOString();
        s.duration = (performance.now() - started) / 1000;
        await persistence;
        await saveLocal({ ...s }).catch(() => {});
        if (mounted.current && generation === epoch.current) {
          setActive(false);
          await refresh();
          setMessage(
            localFailed
              ? "Incomplete recording: inspect locally before retrying."
              : "Recording saved locally. Upload when ready.",
          );
          if (!localFailed && s.count > 0) await upload(s);
        }
      };
      s.startedAt = new Date().toISOString();
      rec.start(4000);
      setActive(true);
      if (controls.current) controls.current.open = false;
    } catch (e) {
      clonedTracks.current.forEach((t) => t.stop());
      setMessage(e instanceof Error ? e.message : "Recording could not start");
    } finally {
      if (mounted.current && generation === epoch.current) {
        operation.current = false;
        setBusy(false);
      }
    }
  }
  async function upload(s: LocalRecording) {
    if (operation.current) return;
    operation.current = true;
    const generation = epoch.current;
    setBusy(true);
    try {
      if (!s.endedAt || !s.duration || s.count === 0)
        throw new Error(
          "This recording was interrupted before finalization. Keep the local source for recovery; start a new session.",
        );
      for (let i = 0; i < s.count; i++) {
        setMessage(`Uploading ${i + 1} of ${s.count}…`);
        const blob = await readChunk(s.id, i);
        if (!blob)
          throw new Error(
            `Local part ${i} is missing; this source cannot be published.`,
          );
        const signed = await lessonRequest(`drafts/${s.lessonId}/upload`, {
          sessionId: s.id,
          index: i,
          size: blob.size,
        });
        if (!signed.alreadyUploaded) {
          const response = await fetch(signed.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: blob,
            signal: AbortSignal.timeout(60000),
          });
          if (!response.ok)
            throw new Error(
              "Upload failed. Local source retained; retry safely.",
            );
        }
      }
      await lessonRequest(`drafts/${s.lessonId}/finalize`, {
        sessionId: s.id,
        startedAt: s.startedAt,
        count: s.count,
        duration: s.duration,
        endedAt: s.endedAt,
        interruptions: s.interruptions,
      });
      await removeLocal(s);
      await refresh();
      setMessage(
        "Source uploaded. Open the lesson workspace to review the draft.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Upload failed; local source retained",
      );
    } finally {
      if (mounted.current && generation === epoch.current) {
        operation.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <aside
      style={{
        position: "absolute",
        bottom: 16,
        zIndex: 3,
        maxHeight: "65vh",
        overflowY: "auto",
        left: 16,
        right: 16,
        maxWidth: 420,
        background: "var(--steel)",
        padding: 12,
        borderRadius: 12,
        fontSize: 14,
      }}
      aria-label="Optional lesson recording"
    >
      <details ref={controls}>
        <summary style={{ minHeight: 36, cursor: "pointer" }}>
          {active
            ? "Recording lesson video"
            : saved.length
              ? "Lesson sources · upload / retry"
              : "Optional lesson recording"}
        </summary>
        <Link href="/lessons/workspace" target="_blank">
          Lesson workspace · sign in first
        </Link>
        <p>
          Optional video lesson. No phone microphone is recorded. Call audio is
          stored separately with your consent.
        </p>
        <label>
          <input
            type="checkbox"
            checked={consent}
            disabled={active || busy}
            onChange={(e) => setConsent(e.target.checked)}
          />{" "}
          I consent to retain this video and call for a private draft.
          Publication needs separate permission.
        </label>
        {active ? (
          <button
            onClick={() => {
              if (recorder.current?.state === "recording")
                recorder.current.stop();
            }}
          >
            Stop lesson recording
          </button>
        ) : (
          <button disabled={busy || !jobId || !consent} onClick={start}>
            Record lesson video
          </button>
        )}
        <p role="status">{message}</p>
        {saved.map((s) => (
          <p key={s.id}>
            {s.endedAt ? "Saved recording" : "Interrupted recording"} ·{" "}
            {s.count} parts{" "}
            <button
              disabled={busy || active || !s.endedAt}
              onClick={() => upload(s)}
            >
              Upload / retry
            </button>
          </p>
        ))}
      </details>
    </aside>
  );
}
