"use client";
// OWNER: Andy. Live camera -> a still every 2 s (+ a burst of 3 when the backend asks) -> POST /api/frames.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameAck, FrameUpload, GeoPoint } from "@/lib/types";
import { FRAMES } from "@/lib/config";
import { api } from "@/lib/routes";

export type Connection = "off" | "ok" | "failing";

export function useFrameCapture(workerId: string, { running = true, point }: { running?: boolean; point?: GeoPoint } = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ack, setAck] = useState<FrameAck | null>(null);
  const [connection, setConnection] = useState<Connection>("off");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const jobIdRef = useRef<string | undefined>(undefined);

  // Open the back camera (HTTPS or localhost only).
  useEffect(() => {
    if (!running) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((e) => setCameraError(e instanceof Error ? e.message : "Camera unavailable"));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [running]);

  const grab = useCallback((): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const scale = Math.min(1, FRAMES.maxEdgePx / Math.max(v.videoWidth, v.videoHeight));
    const c = (canvasRef.current ??= document.createElement("canvas"));
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  }, []);

  const send = useCallback(
    async (burst = false) => {
      const image = grab();
      if (!image) return null;
      const body: FrameUpload = { workerId, jobId: jobIdRef.current, image, burst, point };
      try {
        const r = await fetch(api.frames(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error(String(r.status));
        const a = (await r.json()) as FrameAck;
        jobIdRef.current = a.jobId;
        setAck(a);
        setConnection("ok");
        return a;
      } catch {
        setConnection("failing");
        return null;
      }
    },
    [grab, workerId, point],
  );

  // Still every 2 s; when the backend says wantBurst, send 3 quick frames.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      const a = await send();
      if (a?.wantBurst) for (let i = 0; i < FRAMES.burst; i++) await send(true);
    }, FRAMES.intervalMs);
    return () => clearInterval(id);
  }, [running, send]);

  return { videoRef, ack, connection, cameraError, sendNow: send };
}
