// OWNER: Sunny (AI). POST { job, checks } -> plan steps. GET returns the plan for the demo case.
import { NextResponse } from "next/server";
import type { Check, Job } from "@/lib/types";
import { buildPlan } from "@/lib/ai/buildPlan";
import { demoCase } from "@/lib/mock/demoCase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { job, checks = [] } = (await req.json()) as { job: Job; checks?: Check[] };
  return NextResponse.json(buildPlan(job, checks));
}

export async function GET() {
  const c = demoCase();
  return NextResponse.json(buildPlan(c.job, c.checks));
}
