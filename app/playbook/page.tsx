"use client";
// OWNER: Teammate 1 (screens). Screen 6: Playbook. Data from Teammate 3's /api/playbook.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlaybookEntry } from "@/lib/types";
import { Banner } from "@/components/screens/shell";
import { SearchIcon } from "@/components/screens/Icons";
import s from "@/components/screens/screens.module.css";
import p from "@/components/screens/playbook.module.css";

export default function PlaybookPage() {
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<PlaybookEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/playbook?q=${encodeURIComponent(q.trim())}`, { cache: "no-store", signal: ctrl.signal });
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        setEntries((await r.json()) as PlaybookEntry[]);
        setError("");
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Search failed");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <main>
      <Link href="/" className={p.back}>Back to Snap</Link>
      <h1 className={s.title}>Playbook</h1>
      <p className={s.lede}>Every approved job, saved for the next crew. Search by town or job type.</p>

      <label className={p.search}>
        <span className="visually-hidden">Search the playbook</span>
        <SearchIcon />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Princeton, island receptacle…" />
      </label>

      {error && <Banner tone="error">Couldn&apos;t search the playbook. {error}</Banner>}

      <ul className={s.rows} style={{ marginTop: 20 }} aria-live="polite">
        {entries === null && !error && <li className={s.empty}>Loading saved jobs…</li>}
        {entries?.length === 0 && (
          <li className={s.empty}>
            {q.trim() ? `No saved jobs for "${q.trim()}" yet.` : "No saved jobs yet."} Finished jobs land here after the manager approves.
          </li>
        )}
        {entries?.map((e) => (
          <li key={e.caseId} className={s.row}>
            <Link href={`/job/${e.caseId}/plan`} className={p.entry}>
              <span className={p.town}>{e.town}, {e.state}</span>
              <span className={p.type}>{e.jobType.charAt(0).toUpperCase() + e.jobType.slice(1)}</span>
              <span className={p.summary}>{e.planSummary}</span>
              <span className={p.meta}>
                {new Date(e.date).toLocaleDateString([], { month: "short", day: "numeric" })}, signed off by {e.reviewers.join(" and ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
