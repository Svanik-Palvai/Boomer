// OWNER: Zohaib. Turns a job into the rows of the mini app job sheet (app/m). Pure, so the server page,
// the live-polling client and the Photon card caption all read the same thing.
import type { Job, Worker } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/copy";
import { watchStep, type WatchWorker, type Weight } from "@/lib/risk/watch";

export type RowCode = "seen" | "fixed" | "said" | "notyet" | "now" | "pending";

export const CODE_LABEL: Record<RowCode, string> = {
  seen: "SEEN",
  fixed: "FIXED",
  said: "SAID",
  notyet: "NOT YET",
  now: "NOW",
  pending: "—",
};

export interface SheetRow {
  order: number;
  text: string;
  newHere: boolean;
  code: RowCode;
  how: "CAM" | "VOICE";
  reason: string;
  necSection?: string;
  sourceUrl?: string;
  ruleVerified?: boolean;
  doneAt?: string;
  attempts: number;
  /** How much the step matters (lib/risk/watch.ts). */
  risk: Weight;
  /** Why a supervisor should look at this step now, when there is a reason. */
  watch?: string;
}

export interface SheetSummary {
  done: number;
  total: number;
  seen: number;
  said: number;
  fixed: number;
  newHere: number;
  live: boolean;
  statusLabel: string;
}

/** `worker` sharpens the watch flags (a step new to this worker); without it they go by the job alone. */
export function sheetRows(job: Job, worker?: WatchWorker | null): SheetRow[] {
  return job.steps.map((s, i) => {
    const r = job.results[i];
    const watch = watchStep(job, i, worker);
    let code: RowCode = "pending";
    if (r?.status === "seen") code = r.fails > 0 ? "fixed" : "seen";
    else if (r?.status === "worker_confirmed") code = "said";
    else if (r?.status === "not_yet") code = "notyet";
    else if (i === job.current && job.status === "guiding") code = "now";
    return {
      order: s.order,
      text: s.text,
      newHere: s.tag === "new_here",
      code,
      how: s.check.kind === "vision" ? "CAM" : "VOICE",
      reason: s.reason,
      necSection: s.necSection,
      sourceUrl: s.sourceUrl,
      ruleVerified: s.ruleVerified,
      doneAt: r?.doneAt,
      attempts: r?.attempts ?? 0,
      risk: watch.weight,
      watch: watch.flag,
    };
  });
}

export function sheetSummary(job: Job, rows = sheetRows(job)): SheetSummary {
  const n = (c: RowCode) => rows.filter((r) => r.code === c).length;
  return {
    done: n("seen") + n("fixed") + n("said"),
    total: rows.length,
    seen: n("seen") + n("fixed"),
    said: n("said"),
    fixed: n("fixed"),
    newHere: rows.filter((r) => r.newHere).length,
    live: job.status === "guiding" || job.status === "looking" || job.status === "plan_ready",
    statusLabel: STATUS_LABEL[job.status],
  };
}

/** Short job number for the header: "demo-2041" -> "2041", "job-39c28c45" -> "39C2". */
export function jobNo(id: string): string {
  const tail = id.replace(/^(demo|job)-/, "");
  return /^\d+$/.test(tail) ? tail : tail.slice(0, 4).toUpperCase();
}

/** "Dana Lee" -> "D. Lee". */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
}

/** One line for card captions and texts: "Step 4 of 6 · 3 seen · 1 fixed". */
export function progressLine(job: Job): string {
  const s = sheetSummary(job);
  if (job.status === "done") return `${s.done} of ${s.total} done · ${s.seen} seen on camera${s.fixed ? ` · ${s.fixed} fixed` : ""}`;
  if (job.status === "stopped") return `Stopped at step ${Math.min(job.current + 1, s.total)} of ${s.total}`;
  if (!s.total) return "No plan yet";
  return `Step ${Math.min(job.current + 1, s.total)} of ${s.total} · ${s.seen} seen${s.fixed ? ` · ${s.fixed} fixed` : ""}`;
}

export function placeLine(job: Job, worker?: Worker | null): string {
  const site = job.site ?? job.home;
  return site ? `${site.city}, ${site.state} · NEC ${site.necEdition}` : worker ? `${worker.home.city}, ${worker.home.state}` : "";
}

export function fmtTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });
}
