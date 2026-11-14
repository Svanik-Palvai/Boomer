// OWNER: Zohaib. POST: wipe the in-memory store and re-seed the demo worker + demo-2041.
import { NextResponse } from "next/server";
import { getJob, resetDemo } from "@/lib/db";
import { DEMO_JOB_ID } from "@/lib/mock/demo";

export async function POST() {
  await resetDemo();
  return NextResponse.json(await getJob(DEMO_JOB_ID));
}
