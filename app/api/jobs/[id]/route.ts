// OWNER: Zohaib. GET the full job. The live job view polls this every ~1 s.
import { NextResponse } from "next/server";
import { getJob } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  return job ? NextResponse.json(job) : NextResponse.json({ error: "not found" }, { status: 404 });
}
