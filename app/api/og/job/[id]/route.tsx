// OWNER: Zohaib. The card image iMessage shows for a job: the record once it's closed, the live sheet before that.
import { getJob, getRecordEntryByJob } from "@/lib/db";
import { jobLine, jobPlace, previewImage } from "@/lib/record/preview";
import { placeLine, progressLine } from "@/lib/record/sheet";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const e = await getRecordEntryByJob(params.id).catch(() => null);
  if (e) return previewImage({ kicker: e.outcome === "stopped" ? "Job record · stopped" : "Job record", title: e.title, place: jobPlace(e), line: jobLine(e) });
  const job = await getJob(params.id).catch(() => null);
  if (!job) return previewImage({ kicker: "Job sheet", title: "Job not found", place: "", line: "" });
  return previewImage({ kicker: "Job sheet · live", title: job.title || "New job", place: placeLine(job), line: progressLine(job) });
}
