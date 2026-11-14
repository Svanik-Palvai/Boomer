"use client";
// OWNER: Andy (screens)
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/routes";

/**
 * Polls a JSON endpoint (default: the job). Backs off after failures and reports `stale`
 * so screens can say "Live updates paused" instead of silently freezing.
 *   const { data: job } = usePoll<Job>(api.job(id), { intervalMs: 1000 });
 */
export function usePoll<T>(url: string | null, { intervalMs = 1000, poll = true } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const fails = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (r.status === 404) return setNotFound(true);
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
      setData((await r.json()) as T);
      setNotFound(false); // e.g. a job record that didn't exist until the job closed
      setError(null);
      fails.current = 0;
    } catch (e) {
      fails.current += 1;
      setError(e instanceof Error ? e.message : "Could not reach the server");
    }
  }, [url]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await load();
      // poll: false still retries a failed first load (e.g. while the dev server compiles).
      if (!alive || (!poll && fails.current === 0)) return;
      timer = setTimeout(tick, intervalMs * Math.min(8, 2 ** Math.max(0, fails.current - 1)));
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load, poll, intervalMs]);

  return { data, error, notFound, stale: fails.current >= 2, reload: load };
}

export const useJob = (id: string, opts?: { intervalMs?: number; poll?: boolean }) =>
  usePoll<import("@/lib/types").Job>(api.job(id), opts);
