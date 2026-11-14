"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Case } from "@/lib/types";

/**
 * Polls GET /api/cases/[id]. Backs off after failures and reports `stale`
 * so screens can say "Live updates paused" instead of silently freezing.
 */
export function useCase(id: string, { intervalMs = 2000, poll = true } = {}) {
  const [data, setData] = useState<Case | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const fails = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/cases/${id}`, { cache: "no-store" });
      if (r.status === 404) {
        setNotFound(true);
        return;
      }
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setData((await r.json()) as Case);
      setError(null);
      fails.current = 0;
    } catch (e) {
      fails.current += 1;
      setError(e instanceof Error ? e.message : "Could not reach the server");
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await load();
      if (!alive || !poll) return;
      const wait = intervalMs * Math.min(8, 2 ** Math.max(0, fails.current - 1));
      timer = setTimeout(tick, wait);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load, poll, intervalMs]);

  return { data, error, notFound, stale: fails.current >= 2, reload: load, setData };
}
