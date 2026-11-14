"use client";
// OWNER: Zohaib. The job sheet inside the iMessage mini app. Polls the job while it's open, so the card
// someone tapped (worker, supervisor) shows the step the call is on right now.
import { useEffect, useState } from "react";
import type { Job } from "@/lib/types";
import { CODE_LABEL, fmtDate, fmtTime, jobNo, sheetRows, sheetSummary, shortName } from "@/lib/record/sheet";
import { api } from "@/lib/routes";
import s from "../mini.module.css";

const POLL_MS = 3000;

export function JobSheet({ initial, workerName, recordHref }: { initial: Job; workerName: string; recordHref: string }) {
  const [job, setJob] = useState(initial);
  const rows = sheetRows(job);
  const sum = sheetSummary(job, rows);

  useEffect(() => {
    if (!sum.live) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(api.job(job.id), { cache: "no-store" });
        if (r.ok && !stop) setJob(await r.json());
      } catch {}
    };
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [job.id, sum.live]);

  const site = job.site ?? job.home;
  const nowRow = rows.find((r) => r.code === "now");

  return (
    <>
      <div className={s.sheet}>
        <div className={s.head}>
          <span className={s.kicker}>Job sheet</span>
          {sum.live ? <span className={s.live}>LIVE</span> : <span className={s.status}>{sum.statusLabel}</span>}
          <span className={s.jobNo}>#{jobNo(job.id)}</span>
        </div>
        <div className={s.title}>{job.title || "Job not identified yet"}</div>

        <div className={s.block}>
          <Cell label="Site" value={site ? `${site.city}, ${site.state}` : "—"} />
          <Cell label="Code" value={site ? `NEC ${site.necEdition}` : "—"} warn={site?.necEdition === "needs review"} />
          <Cell label="Electrician" value={shortName(workerName)} />
          <Cell label="Date" value={fmtDate(job.createdAt)} />
        </div>

        <div className={s.progress} aria-label={`${sum.done} of ${sum.total} steps done`}>
          <span className={s.count}>
            {sum.done}/{sum.total}
          </span>
          <span className={s.slots} aria-hidden>
            {rows.map((r) => (
              <span key={r.order} className={s.slot} data-s={r.code} />
            ))}
          </span>
          <span className={s.count}>
            {sum.seen} seen{sum.fixed ? ` · ${sum.fixed} fixed` : ""}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className={s.empty}>No plan yet. Boomer builds the steps once it sees the job on the call.</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.num}>#</th>
                <th>Step</th>
                <th className={s.res}>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.order} className={r.code === "now" ? s.current : r.code === "pending" ? s.pending : undefined}>
                  <td className={s.num}>{r.order}</td>
                  <td>
                    <details className={s.details}>
                      <summary>
                        <span className={s.stepText}>{r.text}</span>
                        {r.newHere && <span className={s.tape}>NEW HERE</span>}
                      </summary>
                      <div className={s.more}>
                        {r.reason}
                        {r.necSection && (
                          <>
                            <br />
                            NEC {r.necSection}
                            {r.ruleVerified === false ? " (not hand-checked yet)" : ""}
                            {r.sourceUrl && (
                              <>
                                {" · "}
                                <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                                  Source
                                </a>
                              </>
                            )}
                          </>
                        )}
                        {r.attempts > 1 && (
                          <>
                            <br />
                            Checked {r.attempts} times
                          </>
                        )}
                      </div>
                    </details>
                  </td>
                  <td className={s.res}>
                    <span className={s.code} data-s={r.code}>
                      {CODE_LABEL[r.code]}
                    </span>
                    <span className={s.how}>{r.how}</span>
                    {r.doneAt && <span className={s.how}>{fmtTime(r.doneAt)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className={s.legend}>
          <span><b>SEEN</b> checked on camera</span>
          <span><b>SAID</b> worker confirmed out loud</span>
          <span><b>FIXED</b> not yet, then seen</span>
          <span><b>NEW HERE</b> differs from home code</span>
        </div>
      </div>

      <div className={s.foot}>
        <span className={s.stamp}>Observed by Boomer</span>
        <br />
        {nowRow ? `On the call now: step ${nowRow.order}. ` : ""}
        <a href={recordHref}>Full work record</a>
      </div>
    </>
  );
}

function Cell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={s.cell}>
      <span className={s.label}>{label}</span>
      <span className={`${s.value} ${warn ? s.review : ""}`}>{value}</span>
    </div>
  );
}
