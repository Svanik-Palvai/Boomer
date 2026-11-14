import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/cases/store";
import { updateCard } from "@/lib/photon/send";
import { advanceGuide } from "@/lib/checks/guide";
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();
    if (typeof body.stepId !== "string")
      return NextResponse.json({ error: "stepId required" }, { status: 400 });
    const c = await getCase(params.id);
    if (!c)
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    // Update the latest record; no client-supplied approval or plan is accepted.
    const saved = await saveCase(advanceGuide(c, body.stepId));
    try {
      await updateCard(saved, "manager");
    } catch {
      return NextResponse.json(saved, {
        headers: { "X-Boomer-Card-Sync": "pending" },
      });
    }
    return NextResponse.json(saved);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 409 },
    );
  }
}
