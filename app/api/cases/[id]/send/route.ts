// OWNER: Z (backend). Called by "Send for review" on the plan screen.
import { NextResponse } from "next/server";
import { getCase, saveCase } from "@/lib/cases/store";
import { sendCard } from "@/lib/photon/send";
import { cardIntro } from "@/lib/agents/reviewAgent";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { cardSession } = await sendCard(c, "local", await cardIntro(c, "local"));
  return NextResponse.json(
    await saveCase({
      ...c,
      status: "with_local_reviewer",
      cardSessions: { ...c.cardSessions, local: cardSession },
    }),
  );
}
