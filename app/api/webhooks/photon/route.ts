// OWNER: Zohaib. Inbound iMessage from Photon. Not in the core flow; logs the text into the worker's job memory.
// TODO(Zohaib): verify PHOTON_WEBHOOK_SECRET, dedup by message id, match the real Photon payload shape.
import { NextResponse } from "next/server";
import { firstTimeSeen } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";
import { remember } from "@/lib/memory/store";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; from?: string; text?: string; jobId?: string };
  if (body.id && !(await firstTimeSeen(`photon:${body.id}`))) return NextResponse.json({ ok: true, duplicate: true });
  const r = await resolveJob({ jobId: body.jobId, callerPhone: body.from });
  if (!r || !body.text) return NextResponse.json({ ok: false });
  await remember(r.job.id, { channel: "imessage", agent: "recorder", speaker: "worker", text: body.text });
  return NextResponse.json({ ok: true, jobId: r.job.id });
}
