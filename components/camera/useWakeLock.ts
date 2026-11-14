"use client";
// OWNER: Andy. Keeps the harness phone's screen on. Re-acquires after the tab becomes visible again.
import { useEffect, useState } from "react";

export function useWakeLock(enabled = true) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
        setHeld(true);
        lock.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
  return held;
}
