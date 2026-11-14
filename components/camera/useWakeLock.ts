"use client";
// OWNER: Andy. Keeps the harness phone's screen on. Re-acquires after the tab becomes visible again
// (the OS drops the lock whenever the page is hidden, e.g. while the call screen is up).
import { useEffect, useState } from "react";

export function useWakeLock(enabled = true) {
  const [held, setHeld] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    if (!("wakeLock" in navigator)) {
      setSupported(false);
      return;
    }
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const acquire = async () => {
      if (lock && !lock.released) return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (!alive) return lock.release().catch(() => {});
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
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [enabled]);

  return { held, supported };
}
