// OWNER: Zohaib. Inbound texts from Photon 2.0 (Standard Webhooks): SMS to PHOTON_NUMBER or iMessage to a 2.0 line.
// Routed by lib/agents/inbox.ts, the same agents and database as the Photon 1.0 webhook (/api/webhooks/spectrum).
// Photon dashboard → Webhooks → the destination must point at https://<app>/api/webhooks/photon, event "message.received".
// Put its whsec_ secret in PHOTON_WEBHOOK_SECRET.
// Payload (apiVersion 2026-07-01): { type: "message.received", data: { object: { platform, status: "received", sentBy: { handle }, content } } }.
// content is { type: "text", text } or, for a multi-part SMS/MMS, { type: "group", parts: [...] }.
// Local testing: with no PHOTON_WEBHOOK_SECRET set, POST { "data": { "object": { "id": "...", "sentBy": { "handle": "+1..." }, "content": { "type": "text", "text": "record" } } } }.
import { NextResponse } from "next/server";
import { handleInboundText } from "@/lib/agents/inbox";
import { firstTimeSeen } from "@/lib/db";
import { verifyPhotonWebhook } from "@/lib/photon/client";
import { sendText } from "@/lib/photon/send";

interface PhotonContent {
  type?: string;
  text?: string;
  parts?: PhotonContent[];
}

interface PhotonMessage {
  id?: string;
  status?: string;
  sentBy?: { handle?: string; kind?: string };
  content?: PhotonContent;
}

/** The text of a message: plain text, or the text parts of a multi-part SMS joined together. */
function textOf(c: PhotonContent | undefined): string {
  if (!c) return "";
  if (c.type === "text") return c.text?.trim() ?? "";
  if (c.type === "group") return (c.parts ?? []).map(textOf).filter(Boolean).join("\n");
  return "";
}

const same = (a?: string, b?: string) => !!a && !!b && a.replace(/\D/g, "").slice(-10) === b.replace(/\D/g, "").slice(-10);

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPhotonWebhook(raw, req.headers)) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  const event = JSON.parse(raw || "{}") as {
    id?: string;
    type?: string;
    data?: PhotonMessage & { object?: PhotonMessage; message?: PhotonMessage };
  };
  const eventId = req.headers.get("webhook-id") ?? event.id;
  if (eventId && !(await firstTimeSeen(`photon:${eventId}`))) return new Response(null, { status: 204 });

  if (event.type && event.type !== "message.received") return new Response(null, { status: 204 });
  const m = event.data?.object ?? event.data?.message ?? event.data;
  const from = m?.sentBy?.handle;
  const text = textOf(m?.content);
  if (!m || !from || !text || m.sentBy?.kind === "agent" || same(from, process.env.PHOTON_NUMBER)) {
    return new Response(null, { status: 204 }); // not an inbound human text
  }

  const { agent, reply, jobId } = await handleInboundText(from, text);
  if (!reply) return NextResponse.json({ ok: true, agent, jobId, replied: false });
  try {
    await sendText(from, reply, `boomer-reply:${eventId}`);
    return NextResponse.json({ ok: true, agent, jobId, replied: true });
  } catch (err) {
    console.error(`[photon webhook] ${agent} reply failed:`, String(err).slice(0, 200));
    return NextResponse.json({ ok: false, agent, jobId, replied: false });
  }
}
