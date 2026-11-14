// OWNER: Zohaib. POST: create or update a worker profile (profile page).
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveWorker } from "@/lib/db";

const Body = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  phone: z.string().min(7),
  experience: z.enum(["new", "journeyman"]),
  home: z.object({ city: z.string(), state: z.string().length(2), necEdition: z.string(), sourceUrl: z.string() }),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await saveWorker(parsed.data));
}
