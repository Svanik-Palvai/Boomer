// OWNER: Zohaib. The card image iMessage shows when the record link unfurls.
import { getRecordEntryByJob } from "@/lib/db";
import { jobLine, jobPlace, previewImage } from "@/lib/record/preview";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const e = await getRecordEntryByJob(params.id).catch(() => null);
  if (!e) return previewImage({ kicker: "Job record", title: "This job isn't finished yet", place: "", line: "" });
  return previewImage({ kicker: e.outcome === "stopped" ? "Job record · stopped" : "Job record", title: e.title, place: jobPlace(e), line: jobLine(e) });
}
