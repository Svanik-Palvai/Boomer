"use client";
// OWNER: Andy. Live camera -> a still every 2 s (+ a burst of 3 when the backend asks) -> POST /api/frames.
//
// Things the harness phone has to survive:
// - Uploads slower than 2 s on venue Wi-Fi: never queue frames; skip a tick while one is in flight,
//   because a check never uses a frame older than 10 s anyway.
// - iOS pausing the camera when a call starts or the page is backgrounded: the track goes "muted"
//   or "ended". We stop sending (a frozen frame must never reach a check) and reopen the camera.
import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameAck, FrameUpload, GeoPoint } from "@/lib/types";
import { FRAMES } from "@/lib/config";
import { api } from "@/lib/routes";

/** off = nothing sent yet · ok = a frame landed in the last 4 s · failing = it hasn't. */
export type Connection = "off" | "ok" | "failing";
/** starting → live; paused when iOS mutes the track; error when the camera can't open at all. */
export type CameraState = "idle" | "starting" | "live" | "paused" | "error";

const OK_WINDOW_MS = 4000;

function cameraErrorText(e: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext)
    return "The camera only opens over HTTPS. Open the Vercel link on this phone, not a local address.";
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError")
    return "Camera access is blocked. Allow the camera for this site in Settings › Safari › Camera, then reload.";
  if (name === "NotReadableError") return "Another app is using the camera. Close it and tap Try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "This phone has no back camera we can open.";
  return "The camera didn't open. Tap Try again.";
}

export function useFrameCapture(
  workerId: string,
  { running = true, point }: { running?: boolean; point?: GeoPoint } = {},
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const jobIdRef = useRef<string | undefined>(undefined);
  const inFlight = useRef(false);
  const pointRef = useRef(point);
  pointRef.current = point;

  const [ack, setAck] = useState<FrameAck | null>(null);
  const [camera, setCamera] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [sent, setSent] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [restartKey, setRestartKey] = useState(0);

  // Open the back camera. Re-runs on restart().
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("error");
      setCameraError(cameraErrorText(null));
      return;
    }
    setCamera("starting");
    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        track.addEventListener("mute", () => setCamera("paused"));
        track.addEventListener("unmute", () => setCamera("live"));
        track.addEventListener("ended", () => setCamera("paused"));
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
        setCamera(track.muted ? "paused" : "live");
      })
      .catch((e) => {
        if (cancelled) return;
        setCamera("error");
        setCameraError(cameraErrorText(e));
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [running, restartKey]);

  const restart = useCallback(() => setRestartKey((k) => k + 1), []);

  // Coming back to the page (after the call screen, or a lock): reopen a dead camera.
  useEffect(() => {
    if (!running) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === "ended") restart();
      else videoRef.current?.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [running, restart]);

  // While paused, try to reopen every few seconds. iOS often hands the camera back once the call UI settles.
  useEffect(() => {
    if (camera !== "paused") return;
    const id = setInterval(() => {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track || track.readyState === "ended") restart();
    }, 3000);
    return () => clearInterval(id);
  }, [camera, restart]);

  const grab = useCallback((): string | null => {
    const v = videoRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!v || !v.videoWidth || !track || track.muted || track.readyState !== "live") return null;
    const scale = Math.min(1, FRAMES.maxEdgePx / Math.max(v.videoWidth, v.videoHeight));
    const c = (canvasRef.current ??= document.createElement("canvas"));
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  }, []);

  /** Upload one image. Used for the 2 s stills, the burst, and the fallback photo button. */
  const upload = useCallback(
    async (image: string, burst = false): Promise<FrameAck | null> => {
      const body: FrameUpload = { workerId, jobId: jobIdRef.current, image, burst, point: pointRef.current };
      try {
        const r = await fetch(api.frames(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(String(r.status));
        const a = (await r.json()) as FrameAck;
        jobIdRef.current = a.jobId;
        setAck(a);
        setLastOkAt(Date.now());
        setSent((n) => n + 1);
        return a;
      } catch {
        return null;
      }
    },
    [workerId],
  );

  const sendFrame = useCallback(
    async (burst = false) => {
      const image = grab();
      return image ? upload(image, burst) : null;
    },
    [grab, upload],
  );

  // A still every 2 s, skipped while the last one is still uploading. On wantBurst, 3 quick frames.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const a = await sendFrame();
        if (a?.wantBurst) for (let i = 0; i < FRAMES.burst; i++) await sendFrame(true);
      } finally {
        inFlight.current = false;
      }
    }, FRAMES.intervalMs);
    return () => clearInterval(id);
  }, [running, sendFrame]);

  // Clock for the connection dot and "last frame 3 s ago".
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const sinceOkMs = lastOkAt == null ? null : Math.max(0, now - lastOkAt);
  const connection: Connection = sinceOkMs == null ? "off" : sinceOkMs <= OK_WINDOW_MS ? "ok" : "failing";

  return { videoRef, ack, camera, cameraError, connection, sinceOkMs, sent, restart, upload };
}
