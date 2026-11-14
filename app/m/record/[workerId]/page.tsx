// OWNER: Zohaib. iMessage mini app: the work record as a sheet. One row per job, totals at the bottom,
// each row opens that job's sheet. This is the card a worker forwards to a new employer.
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorker, listRecordEntries } from "@/lib/db";
import { RECORD_LABEL, SAFETY_LINE } from "@/lib/copy";
import { buildWorkRecord } from "@/lib/record/buildEntry";
import { previewMetadata } from "@/lib/record/preview";
import { fmtDate } from "@/lib/record/sheet";
import { api, pages } from "@/lib/routes";
import s from "../../mini.module.css";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#e9ebee", colorScheme: "light dark" };

export async function generateMetadata({ params }: { params: { workerId: string } }): Promise<Metadata> {
  const worker = await getWorker(params.workerId).catch(() => null);
  if (!worker) return previewMetadata("Work record", RECORD_LABEL, pages.miniRecord(params.workerId), api.ogRecord(params.workerId));
  const rec = buildWorkRecord(worker, await listRecordEntries(worker.id).catch(() => []));
  const states = Object.keys(rec.totals.byState);
  return previewMetadata(
    `${worker.name} · Work record`,
    `${rec.totals.jobs} job${rec.totals.jobs === 1 ? "" : "s"}${states.length ? ` in ${states.join(", ")}` : ""}. ${RECORD_LABEL}.`,
    pages.miniRecord(worker.id),
    api.ogRecord(worker.id),
  );
}

export default async function MiniRecordPage({ params }: { params: { workerId: string } }) {
  const worker = await getWorker(params.workerId);
  if (!worker) notFound();
  const rec = buildWorkRecord(worker, await listRecordEntries(worker.id));
  const entries = [...rec.entries].sort((a, b) => b.date.localeCompare(a.date));
  const sum = (k: "done" | "total" | "seen" | "corrected" | "newHere") => entries.reduce((n, e) => n + e.counts[k], 0);
  const states = Object.keys(rec.totals.byState);
  const since = entries.length ? fmtDate(entries[entries.length - 1].date) : fmtDate(worker.createdAt);

  return (
    <div className={`surface-card ${s.page}`}>
      <div className={s.sheet}>
        <div className={s.head}>
          <span className={s.kicker}>Work record</span>
          <span className={s.jobNo}>{entries.length} job{entries.length === 1 ? "" : "s"}</span>
        </div>
        <div className={s.title}>{worker.name}</div>

        <div className={s.block}>
          <Cell label="Level" value={worker.experience === "journeyman" ? "Journeyman" : "New / apprentice"} />
          <Cell label="Home" value={`${worker.home.city}, ${worker.home.state}`} />
          <Cell label="Home code" value={`NEC ${worker.home.necEdition}`} warn={worker.home.necEdition === "needs review"} />
          <Cell label="Since" value={since} />
        </div>

        {/* Key numbers, like the top row of a spreadsheet. */}
        <div className={s.kpi}>
          <Cell label="Jobs" value={String(entries.length)} big />
          <Cell label="States" value={states.length ? states.join(" ") : "—"} big />
          <Cell label="Seen on cam" value={String(sum("seen"))} big />
          <Cell label="Fixed" value={String(sum("corrected"))} big />
        </div>

        {entries.length === 0 ? (
          <p className={s.empty}>No finished jobs yet. Each job Boomer guides lands here with what was seen on camera.</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.date}>Date</th>
                <th>Job</th>
                <th className={s.right} style={{ width: 58 }}>Steps</th>
                <th className={s.right} style={{ width: 48 }}>Seen</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={s.date}>{fmtDate(e.date)}</td>
                  <td>
                    <Link className={s.rowLink} href={pages.miniJob(e.jobId)}>
                      {e.title}
                      <span className={s.sub}>
                        {e.city}, {e.state} · NEC {e.codeEdition}
                        {e.outcome === "stopped" ? " · stopped" : ""}
                      </span>
                      {e.counts.newHere > 0 && <span className={s.tape}>{e.counts.newHere} NEW HERE</span>}
                    </Link>
                  </td>
                  <td className={s.right}>
                    {e.counts.done}/{e.counts.total}
                  </td>
                  <td className={s.right}>{e.counts.seen}</td>
                </tr>
              ))}
              <tr className={s.total}>
                <td className={s.date}>Total</td>
                <td>{states.length ? `${states.length} state${states.length === 1 ? "" : "s"}` : ""}</td>
                <td className={s.right}>
                  {sum("done")}/{sum("total")}
                </td>
                <td className={s.right}>{sum("seen")}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className={s.legend}>
          <span><b>Seen</b> step checked on camera</span>
          <span><b>Fixed</b> not yet, then seen</span>
          <span><b>New here</b> differs from home code</span>
        </div>
      </div>
      <div className={s.foot}>
        <span className={s.stamp}>{RECORD_LABEL}</span>
        <br />
        {SAFETY_LINE}
      </div>
    </div>
  );
}

function Cell({ label, value, warn, big }: { label: string; value: string; warn?: boolean; big?: boolean }) {
  return (
    <div className={s.cell}>
      <span className={s.label}>{label}</span>
      <span className={`${s.value} ${big ? s.big : ""} ${warn ? s.review : ""}`}>{value}</span>
    </div>
  );
}
