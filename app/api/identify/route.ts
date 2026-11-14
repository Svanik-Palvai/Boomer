// OWNER: Teammate 3 (AI)
import { NextResponse } from "next/server";
import { identifyJob } from "@/lib/ai/identifyJob";

export async function POST(req: Request) {
  const { photo, note } = (await req.json()) as { photo: string; note?: string };
  return NextResponse.json(await identifyJob(photo, note));
}
