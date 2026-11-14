// OWNER: Zohaib. GET ?workerId= lists a worker's jobs; POST { workerId } opens (or returns) their open job.
import { NextResponse } from "next/server";
import { listJobs } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const workerId = new URL(req.url).searchParams.get("workerId");
  if (!workerId) return NextResponse.json({ error: "workerId required" }, { status: 400 });
  return NextResponse.json(await listJobs(workerId));
}

export async function POST(req: Request) {
  const { workerId } = (await req.json().catch(() => ({}))) as { workerId?: string };
  if (!workerId) return NextResponse.json({ error: "workerId required" }, { status: 400 });
  const r = await resolveJob({ workerId });
  return r ? NextResponse.json(r.job) : NextResponse.json({ error: "no such worker" }, { status: 404 });
}
