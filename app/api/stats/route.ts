// OWNER: Zohaib. Traction numbers for the last slide.
import { NextResponse } from "next/server";
import { tractionStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await tractionStats());
}
