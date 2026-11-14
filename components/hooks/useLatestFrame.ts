"use client";
// OWNER: Andy (screens). The newest camera frame for a job, refreshed every second, plus its age.
// Fetches the image as a blob so the old frame stays on screen until the new one has fully loaded
// (no flicker), and reads X-Frame-At so the live view can say when frames stop arriving.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/routes";

export function useLatestFrame(jobId: string, intervalMs = 1000) {
  const [src, setSrc] = useState<string | null>(null);
  const [frameAt, setFrameAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let lastAt: string | null = null;

    const tick = async () => {
      try {
        const r = await fetch(api.latestFrame(jobId), { cache: "no-store" });
        const at = r.headers.get("X-Frame-At");
        if (r.status === 200 && at !== lastAt) {
          const blob = await r.blob();
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          lastAt = at;
          setSrc(url);
          setFrameAt(at ? Date.parse(at) : Date.now());
        }
      } catch {
        // keep the last frame; its age tells the room something is wrong
      }
      if (alive) {
        setNow(Date.now());
        timer = setTimeout(tick, intervalMs);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [jobId, intervalMs]);

  const ageMs = frameAt == null ? null : Math.max(0, now - frameAt);
  return { src, ageMs };
}
