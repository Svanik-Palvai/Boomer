import { NextResponse } from "next/server";
import { z } from "zod";
import { runChecks } from "@/lib/checks/runChecks";
const jurisdiction = z.object({
  city: z.string().min(1).max(120),
  state: z.string().regex(/^[A-Z]{2}$/),
  necEdition: z.string(),
  sourceUrl: z.string(),
});
const job = z.object({
  id: z.string(),
  component: z.string().min(1).max(200),
  task: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
  home: jurisdiction,
  site: jurisdiction,
});
export async function POST(req: Request) {
  try {
    const parsed = job.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid job", details: parsed.error.flatten() },
        { status: 400 },
      );
    return NextResponse.json(runChecks(parsed.data));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
