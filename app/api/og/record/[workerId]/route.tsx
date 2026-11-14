// OWNER: Zohaib. The card image iMessage shows when the work record link unfurls.
import { getWorker, listRecordEntries } from "@/lib/db";
import { jobLine, jobPlace, previewImage } from "@/lib/record/preview";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { workerId: string } }) {
  const worker = await getWorker(params.workerId).catch(() => null);
  if (!worker) return previewImage({ kicker: "Work record", title: "Work record", place: "", line: "" });
  const entries = await listRecordEntries(worker.id).catch(() => []);
  const latest = entries[0];
  const states = Array.from(new Set(entries.map((e) => e.state))).join(", ");
  return previewImage({
    kicker: "Work record",
    title: worker.name,
    place: `${entries.length} job${entries.length === 1 ? "" : "s"}${states ? ` · ${states}` : ""}`,
    line: latest ? `Latest: ${latest.title}, ${jobPlace(latest).split(" · ")[0]} · ${jobLine(latest).split(" · ")[0]}` : "No jobs yet",
  });
}
