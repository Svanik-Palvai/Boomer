// OWNER: Z (backend). Mini app cards POST their structured decision here.
import { NextResponse } from "next/server";
import type { CardDecision, Case } from "@/lib/types";
import { getCase, saveCase } from "@/lib/cases/store";
import { remember } from "@/lib/memory/store";

/**
 * TODO(Z): after saving, send the next stage's card (local -> manager), and
 * edit the existing card in place with its cardSession so it shows the new status.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const d = (await req.json()) as CardDecision;
  const c = await getCase(params.id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status: Case["status"] =
    d.stage === "manager"
      ? d.decision === "approved"
        ? "approved"
        : "with_local_reviewer"
      : d.decision === "confirmed"
        ? "with_manager"
        : "plan_revised";

  const reviews = c.reviews.map((r) =>
    r.stage === d.stage ? { ...r, decision: d.decision, at: new Date().toISOString() } : r,
  );
  await saveCase({ ...c, status, reviews });
  await remember(c.id, {
    channel: "mini_app",
    speaker: d.stage === "local" ? "local_reviewer" : "manager",
    agent: "review",
    text: `${d.decision}${d.note ? `: ${d.note}` : ""}${d.stepEdits?.length ? ` (${d.stepEdits.length} step edits)` : ""}`,
  });
  return NextResponse.json({ status });
}
