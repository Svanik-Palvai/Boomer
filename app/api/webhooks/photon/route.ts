// OWNER: Z (Photon + backend)
import { NextResponse } from "next/server";
import type { Stage } from "@/lib/types";
import { getCase, saveCase } from "@/lib/cases/store";
import { parseReply } from "@/lib/ai/parseReply";
import { applyActions } from "@/lib/cases/applyActions";
import { remember } from "@/lib/memory/store";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";

/**
 * Inbound free-text iMessage reply from Photon (fallback when nobody taps the card).
 * TODO(Z): verify signature, dedup by photonMessageId, match sender phone -> case + stage.
 * For local testing you can POST { caseId, stage, text } directly.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { caseId?: string; stage?: Stage; text: string };
  const c = await getCase(body.caseId ?? DEMO_CASE_ID);
  if (!c) return NextResponse.json({ error: "no case" }, { status: 404 });
  const stage: Stage = body.stage ?? "local";

  await remember(c.id, {
    channel: "imessage",
    speaker: stage === "local" ? "local_reviewer" : "manager",
    agent: "review",
    text: body.text,
  });

  const fresh = (await getCase(c.id))!;
  const actions = await parseReply(body.text, fresh, stage);
  const updated = await saveCase(applyActions(fresh, actions, stage));
  return NextResponse.json({ actions, status: updated.status });
}
