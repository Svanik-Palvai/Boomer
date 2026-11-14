"use client";
// OWNER: Andy (screens). Harness phone: live camera, sends frames, keeps the screen awake,
// shows the step number and a connection dot. Nothing to tap mid-job.
import { useEffect, useRef, useState } from "react";
import type { GeoPoint } from "@/lib/types";
import { useFrameCapture } from "@/components/camera/useFrameCapture";
import { useWakeLock } from "@/components/camera/useWakeLock";
import { api } from "@/lib/routes";

export default function CameraPage({ params }: { params: { workerId: string } }) {
  const [started, setStarted] = useState(false); // iOS needs one tap before camera + wake lock
  const [point, setPoint] = useState<GeoPoint>();
  const awake = useWakeLock(started);
  const { videoRef, ack, connection, cameraError } = useFrameCapture(params.workerId, { running: started, point });
  const sentSite = useRef<string | null>(null);

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
    if (!ack?.jobId || !point || sentSite.current === ack.jobId) return;
    sentSite.current = ack.jobId;
    fetch(api.jurisdiction(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: ack.jobId, ...point }),
    }).catch(() => {});
  }, [ack?.jobId, point]);

  const dot = { off: "#888", ok: "var(--ground-green)", failing: "var(--hot-red)" }[connection];

  if (!started) {
    return (
      <main>
        <h1>Camera</h1>
        <p className="muted">Put the phone in the harness, then tap start and call Boomer.</p>
        <button className="btn" style={{ marginTop: 24 }} onClick={() => setStarted(true)}>Start camera</button>
      </main>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000" }}>
      <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{ position: "absolute", top: 16, left: 16, right: 16, display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700 }}>
        <span>{ack?.stepNumber ? `Step ${ack.stepNumber} of ${ack.stepCount}` : "Waiting for the call"}</span>
        <span aria-label={`Connection ${connection}`} style={{ width: 20, height: 20, borderRadius: 10, background: dot }} />
      </div>
      {(cameraError || !awake) && (
        <p style={{ position: "absolute", bottom: 16, left: 16, right: 16 }} role="status">
          {cameraError ?? "Screen may sleep: wake lock not held."}
        </p>
      )}
    </div>
  );
}
