// OWNER: Zohaib. Inbound texts from Photon 2.0 (Standard Webhooks). Not in the core flow:
// the text goes into the worker's job memory, then the recorder agent (lib/agents/recorder.ts) reads that memory and replies.
// Photon dashboard → Webhooks → Add a destination: this URL, event "message.received" (or *). Put the whsec_ secret in PHOTON_WEBHOOK_SECRET.
// Local testing: with no PHOTON_WEBHOOK_SECRET set, POST { "data": { "id": "...", "sentBy": { "handle": "+1..." }, "content": { "type": "text", "text": "record" } } }.
import { NextResponse } from "next/server";
import { recorderReply } from "@/lib/agents/recorder";
import { firstTimeSeen } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";
import { remember } from "@/lib/memory/store";
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

  const r = await resolveJob({ callerPhone: m.sentBy.handle, create: false });
  if (!r) return new Response(null, { status: 204 });
  await remember(r.job.id, { channel: "imessage", agent: "recorder", speaker: "worker", text: m.content.text });
  const reply = await recorderReply(r.job, r.worker, m.content.text);
  if (reply) {
    await sendText(r.worker.phone, reply, `boomer-reply:${eventId}`);
    await remember(r.job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text: reply });
  }
  return NextResponse.json({ ok: true, jobId: r.job.id, replied: !!reply });
}
