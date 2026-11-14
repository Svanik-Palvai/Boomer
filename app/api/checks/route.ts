// OWNER: Teammate 4 (checks)
import { NextResponse } from "next/server";
import type { Job } from "@/lib/types";
import { runChecks } from "@/lib/checks/runChecks";

export async function POST(req: Request) {
  const job = (await req.json()) as Job;
  return NextResponse.json(runChecks(job));
}
