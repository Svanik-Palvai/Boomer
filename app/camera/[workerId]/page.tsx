"use client";
// OWNER: Andy (screens). Harness phone: live camera, sends frames, keeps the screen awake,
// shows the step number and a connection dot. Nothing to tap mid-job; "Show me" is for when the worker
// takes the phone out of the harness to see a part marked on a photo.
import { useEffect, useRef, useState } from "react";
import type { GeoPoint, Job, Worker } from "@/lib/types";
import { useFrameCapture } from "@/components/camera/useFrameCapture";
import { useWakeLock } from "@/components/camera/useWakeLock";
import { usePoll } from "@/components/hooks/useJob";
import { ShowMe } from "@/components/camera/ShowMe";
import { ActionBar, Banner, Tape } from "@/components/screens/shell";
import { FRAMES } from "@/lib/config";
import { api } from "@/lib/routes";
import s from "./camera.module.css";

export default function CameraPage({ params }: { params: { workerId: string } }) {
  const [started, setStarted] = useState(false); // iOS needs one tap before camera + wake lock
  const [point, setPoint] = useState<GeoPoint>();
  const { data: worker, notFound } = usePoll<Worker>(api.worker(params.workerId), { poll: false });
  const wake = useWakeLock(started);
  const cam = useFrameCapture(params.workerId, { running: started, point });
  const { data: job } = usePoll<Job>(cam.ack?.jobId ? api.job(cam.ack.jobId) : null, { intervalMs: 2000 });
  const sentSite = useRef<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // GPS once at start.
  useEffect(() => {
    if (!started || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPoint({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => {},
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [started]);

  // Once we know the job, send the GPS point so the backend can set the town.
  useEffect(() => {
    if (!cam.ack?.jobId || !point || sentSite.current === cam.ack.jobId) return;
    sentSite.current = cam.ack.jobId;
    fetch(api.jurisdiction(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: cam.ack.jobId, ...point }),
    }).catch(() => {});
  }, [cam.ack?.jobId, point]);

  if (!started) {
    return (
      <main>
        <h1>Harness camera</h1>
        {notFound ? (
          <Banner tone="error">No worker {params.workerId}. Fill in your profile first.</Banner>
        ) : (
          worker && (
            <p className={s.who}>
              {worker.name} · {worker.home.city}, {worker.home.state}
            </p>
          )
        )}
        <ol className={s.setup}>
          <li>Put this phone in the chest harness with the back camera facing the work.</li>
          <li>Tap Start camera and allow the camera and location.</li>
          <li>Call Boomer and say what the job is. Boomer looks through this camera the whole time.</li>
        </ol>
        <ActionBar note="Keep this page open. The screen stays on by itself.">
          <button className="btn" onClick={() => setStarted(true)}>
            Start camera
          </button>
        </ActionBar>
      </main>
    );
  }

  const step = job && job.status === "guiding" ? job.steps[job.current] : undefined;
  const stepCount = cam.ack?.stepCount ?? job?.steps.length ?? 0;
  const stepNumber = cam.ack?.stepNumber ?? null;

  return (
    <div className={s.screen}>
      <header className={s.hud}>
        <div className={s.hudTop}>
          <Heading status={job?.status ?? cam.ack?.status} stepNumber={stepNumber} stepCount={stepCount} />
          <Signal connection={cam.connection} sinceOkMs={cam.sinceOkMs} camera={cam.camera} />
        </div>
        {step && (
          <p className={s.stepText}>
            {step.tag === "new_here" && (
              <>
                <Tape>New here</Tape>{" "}
              </>
            )}
            {step.text}
          </p>
        )}
        {job?.status === "done" && <p className={s.stepText}>Job done. Your record is on its way by text.</p>}
        {job?.status === "stopped" && (
          <p className={s.stepText}>Stopped. Make the work safe before you leave it, and tell your supervisor.</p>
        )}
      </header>

      <div className={s.viewport}>
        <video ref={cam.videoRef} className={s.video} playsInline muted autoPlay />
        {cam.camera !== "live" && <CameraNotice cam={cam} />}
      </div>

      <footer className={s.foot}>
        <div className={s.footText}>
          <span className="num">
            {cam.sent} {cam.sent === 1 ? "frame" : "frames"} sent
          </span>
          {(!wake.supported || !wake.held) && <span>Screen may sleep: set Auto-Lock to Never</span>}
        </div>
        <button
          className={`btn ${s.showMe}`}
          type="button"
          disabled={cam.camera !== "live"}
          onClick={() => setPhoto(cam.snapshot())}
        >
          Show me
        </button>
      </footer>

      {photo && (
        <ShowMe
          image={photo}
          workerId={params.workerId}
          jobId={cam.ack?.jobId}
          stepId={step?.id}
          stepNumber={stepNumber}
          onRetake={() => setPhoto(cam.snapshot())}
          onClose={() => setPhoto(null)}
        />
      )}
    </div>
  );
}

function Heading({
  status,
  stepNumber,
  stepCount,
}: {
  status?: Job["status"];
  stepNumber: number | null;
  stepCount: number;
}) {
  if (status === "guiding" && stepNumber)
    return (
      <p className={s.step} aria-label={`Step ${stepNumber} of ${stepCount}`}>
        <span className={s.stepLabel}>Step</span>
        <span className="num">
          {stepNumber}
          <span className={s.of}>/{stepCount}</span>
        </span>
      </p>
    );
  const text =
    status === "looking"
      ? "Boomer is looking"
      : status === "plan_ready"
        ? "Plan ready"
        : status === "done"
          ? "Done"
          : status === "stopped"
            ? "Stopped"
            : "Call Boomer";
  return <p className={s.waiting}>{text}</p>;
}

function Signal({
  connection,
  sinceOkMs,
  camera,
}: {
  connection: "off" | "ok" | "failing";
  sinceOkMs: number | null;
  camera: string;
}) {
  const label =
    camera !== "live"
      ? "Camera off"
      : connection === "ok"
        ? "Sending"
        : connection === "off"
          ? "Connecting"
          : `No signal ${Math.round((sinceOkMs ?? 0) / 1000)} s`;
  const tone = camera === "live" && connection === "ok" ? s.dotOk : connection === "failing" ? s.dotBad : s.dotOff;
  return (
    <p className={s.signal} role="status" aria-live="polite">
      <span className={`${s.dot} ${tone}`} aria-hidden />
      <span className="num">{label}</span>
    </p>
  );
}

function CameraNotice({ cam }: { cam: ReturnType<typeof useFrameCapture> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  async function sendPhoto(file: File) {
    setSending(true);
    try {
      await cam.upload(await downscale(file));
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const title =
    cam.camera === "starting" ? "Opening the camera" : cam.camera === "paused" ? "Camera paused" : "Camera unavailable";
  const body =
    cam.camera === "paused"
      ? "The phone paused the camera, usually when a call starts. Boomer gets no pictures until it's back."
      : cam.camera === "error"
        ? cam.cameraError
        : null;

  return (
    <div className={s.notice}>
      <p className={s.noticeTitle}>{title}</p>
      {body && <p>{body}</p>}
      {cam.camera !== "starting" && (
        <>
          <button className="btn" onClick={cam.restart}>
            Try again
          </button>
          <label className="btn-quiet">
            {sending ? "Sending photo…" : "Send a photo instead"}
            <input
              ref={fileRef}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && sendPhoto(e.target.files[0])}
            />
          </label>
        </>
      )}
    </div>
  );
}

/** Same size and format as a live frame, so the backend can't tell the difference. */
async function downscale(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, FRAMES.maxEdgePx / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.75);
}
