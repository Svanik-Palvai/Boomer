// OWNER: Zohaib. GET the worker's WorkRecord (all jobs, totals, share link).
import { NextResponse } from "next/server";
import { getWorker, listRecordEntries } from "@/lib/db";
import { buildWorkRecord } from "@/lib/record/buildEntry";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { workerId: string } }) {
  const worker = await getWorker(params.workerId);
  if (!worker) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(buildWorkRecord(worker, await listRecordEntries(worker.id)));
}
