// OWNER: Zohaib. GET the RecordEntry for one closed job (404 until the job is done or stopped).
import { NextResponse } from "next/server";
import { getRecordEntryByJob } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const e = await getRecordEntryByJob(params.id);
  return e ? NextResponse.json(e) : NextResponse.json({ error: "not found" }, { status: 404 });
}
