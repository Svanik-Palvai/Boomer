// OWNER: Zohaib. Inbound texts from Photon 2.0 (Standard Webhooks). Routed by lib/agents/inbox.ts.
// Only used while iMessage runs on Photon 2.0; with Photon 1.0 texting on, inbound comes to /api/webhooks/spectrum.
// Photon dashboard → Webhooks → Add a destination: this URL, event "message.received" (or *). Put the whsec_ secret in PHOTON_WEBHOOK_SECRET.
// Local testing: with no PHOTON_WEBHOOK_SECRET set, POST { "data": { "id": "...", "sentBy": { "handle": "+1..." }, "content": { "type": "text", "text": "record" } } }.
import { NextResponse } from "next/server";
import { handleInboundText } from "@/lib/agents/inbox";
import { firstTimeSeen } from "@/lib/db";
import { verifyPhotonWebhook } from "@/lib/photon/client";
import { sendText } from "@/lib/photon/send";

interface PhotonMessage {
  id?: string;
  status?: string;
  sentBy?: { handle?: string; kind?: string };
  content?: { type?: string; text?: string };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPhotonWebhook(raw, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const event = JSON.parse(raw || "{}") as { id?: string; type?: string; data?: PhotonMessage & { message?: PhotonMessage } };
  const eventId = req.headers.get("webhook-id") ?? event.id;
  if (eventId && !(await firstTimeSeen(`photon:${eventId}`))) return new Response(null, { status: 204 });

  const m = event.data?.message ?? event.data;
  if (!m || m.sentBy?.kind === "agent" || m.content?.type !== "text" || !m.sentBy?.handle || !m.content.text) {
    return new Response(null, { status: 204 }); // not an inbound human text
  }

  const from = m.sentBy.handle;
  const { agent, reply, jobId } = await handleInboundText(from, m.content.text);
  if (!reply) return NextResponse.json({ ok: true, agent, jobId, replied: false });
  try {
    await sendText(from, reply, `boomer-reply:${eventId}`);
    return NextResponse.json({ ok: true, agent, jobId, replied: true });
  } catch (err) {
    console.error(`[photon webhook] ${agent} reply failed:`, String(err).slice(0, 200));
    return NextResponse.json({ ok: false, agent, jobId, replied: false });
  }
}
