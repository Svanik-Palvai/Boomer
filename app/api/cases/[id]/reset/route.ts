// Shared: resets the demo case between rehearsals.
import { NextResponse } from "next/server";
import { resetDemoCase } from "@/lib/cases/store";

export async function POST() {
  return NextResponse.json(await resetDemoCase());
}
