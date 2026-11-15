// OWNER: Zohaib. POST a FrameUpload from the camera page (a still every second, a burst of 3 on "done").
import { NextResponse } from "next/server";
import type { FrameAck, FrameUpload } from "@/lib/types";
import { addFrame, burstWanted, updateJob } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";
import { stepNumber } from "@/lib/agent/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as FrameUpload | null;
  if (!body?.workerId || !body.image?.startsWith("data:image/"))
    return NextResponse.json({ error: "workerId and a data:image/... image are required" }, { status: 400 });

  const r = await resolveJob({ jobId: body.jobId, workerId: body.workerId });
  if (!r) return NextResponse.json({ error: "no such worker" }, { status: 404 });

  let job = r.job;
  if (body.point && !job.point) job = await updateJob(job.id, (j) => ({ ...j, point: body.point }));

  const frame = await addFrame({ jobId: job.id, workerId: body.workerId, image: body.image, burst: body.burst });
  const ack: FrameAck = {
    ok: true,
    frameId: frame.id,
    jobId: job.id,
    status: job.status,
    stepNumber: stepNumber(job),
    stepCount: job.steps.length,
    wantBurst: await burstWanted(job.id),
  };
  return NextResponse.json(ack);
}
