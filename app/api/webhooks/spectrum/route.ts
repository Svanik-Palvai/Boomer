// OWNER: Zohaib. Inbound iMessages from Photon 1.0 (Spectrum). Same agents as the 2.0 webhook (lib/agents/inbox.ts);
// the reply goes back into the same chat, from the same number that sends the mini app cards.
// Photon 1.0 dashboard (app.photon.codes) → project → Webhooks → Add webhook: this URL. Put its signing secret in
// PHOTON_STABLE_WEBHOOK_SECRET. The sender must be a project user (Users page) for the shared line to route to us.
import { NextResponse } from "next/server";
import { handleInboundText } from "@/lib/agents/inbox";
import { firstTimeSeen } from "@/lib/db";
import { handleStableWebhook, stableConfigured } from "@/lib/photon/stable";

export const dynamic = "force-dynamic";
// The reply (sign-up, recorder answer, supervisor approval) runs before the response returns; give it room.
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!stableConfigured()) return NextResponse.json({ error: "Photon 1.0 not configured" }, { status: 503 });
  return handleStableWebhook(req, async (m) => {
    if (!(await firstTimeSeen(`spectrum:${m.id}`))) return; // deliveries are at-least-once
    const { agent, reply } = await handleInboundText(m.from, m.text);
    if (!reply) return;
    try {
      await m.reply(reply);
    } catch (err) {
      console.error(`[spectrum webhook] ${agent} reply failed:`, String(err).slice(0, 200));
    }
  });
}
