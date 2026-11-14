// OWNER: Zohaib. iMessage mini app: the job sheet. A Photon 1.0 card opens this inside iMessage (Spectrum extension);
// anywhere else it's a normal page. Server-rendered first paint, then the client polls while the job is open.
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getJob, getWorker } from "@/lib/db";
import { RECORD_LABEL } from "@/lib/copy";
import { previewMetadata } from "@/lib/record/preview";
import { jobNo, placeLine, progressLine } from "@/lib/record/sheet";
import { api, pages } from "@/lib/routes";
import { JobSheet } from "../../_ui/JobSheet";
import s from "../../mini.module.css";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#e9ebee", colorScheme: "light dark" };

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const job = await getJob(params.id).catch(() => null);
  if (!job) return previewMetadata("Job sheet", RECORD_LABEL, pages.miniJob(params.id), api.ogJob(params.id));
  // These tags become the card's caption lines in iMessage.
  return previewMetadata(
    `Job #${jobNo(job.id)} · ${job.title || "New job"}`,
    `${placeLine(job)}. ${progressLine(job)}. ${RECORD_LABEL}.`,
    pages.miniJob(job.id),
    api.ogJob(job.id),
  );
}

export default async function MiniJobPage({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) notFound();
  const worker = await getWorker(job.workerId);
  return (
    <div className={`surface-card ${s.page}`}>
      <JobSheet initial={job} workerName={worker?.name ?? "Electrician"} recordHref={pages.miniRecord(job.workerId)} />
    </div>
  );
}
