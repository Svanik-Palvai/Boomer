// OWNER: Zohaib
import { NextResponse } from "next/server";
import { getWorker } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const w = await getWorker(params.id);
  return w ? NextResponse.json(w) : NextResponse.json({ error: "not found" }, { status: 404 });
}
