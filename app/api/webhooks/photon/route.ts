// OWNER: Zohaib. Inbound texts from Photon 2.0 (Standard Webhooks). Not in the core flow. Each text goes to one agent:
//   unknown number            -> sign-up agent (lib/agents/signup.ts)
//   share / supervisor command -> share agent (lib/agents/share.ts)
//   anything else             -> recorder agent (lib/agents/recorder.ts), which answers from the shared job memory
// Photon dashboard → Webhooks → Add a destination: this URL, event "message.received" (or *). Put the whsec_ secret in PHOTON_WEBHOOK_SECRET.
// Local testing: with no PHOTON_WEBHOOK_SECRET set, POST { "data": { "id": "...", "sentBy": { "handle": "+1..." }, "content": { "type": "text", "text": "record" } } }.
import { NextResponse } from "next/server";
import { recorderReply } from "@/lib/agents/recorder";
import { shareReply } from "@/lib/agents/share";
import { signupReply } from "@/lib/agents/signup";
import { firstTimeSeen, getWorkerByPhone, normalizePhone } from "@/lib/db";
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

  const from = normalizePhone(m.sentBy.handle);
  const text = m.content.text;
  const reply = (r: string, agent: string, jobId?: string) =>
    sendText(from, r, `boomer-reply:${eventId}`).then(
      () => NextResponse.json({ ok: true, agent, jobId, replied: true }),
      (err) => (console.error(`[photon webhook] ${agent} reply failed:`, String(err).slice(0, 200)), NextResponse.json({ ok: false, agent, jobId, replied: false })),
    );

  const worker = await getWorkerByPhone(from);
  if (!worker) return reply(await signupReply(from, text), "signup");

  const r = await resolveJob({ callerPhone: from, create: false });
  const job = r?.job ?? null;
  if (job) await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "worker", text });

  const shared = await shareReply(job, worker, text);
  if (shared) return reply(shared, "share", job?.id);

  if (!job) {
    if (/^(ok(ay)?|k|cool|got it|thanks?|thank you|thx|ty|great|nice|👍|🙏)[\s.!]*$/i.test(text.trim())) return NextResponse.json({ ok: true, agent: "recorder", replied: false });
    const n = process.env.PHOTON_NUMBER;
    return reply(`No jobs on your record yet. When you're on one, call Boomer${n ? ` at ${n}` : ""}.`, "recorder");
  }
  const answer = await recorderReply(job, worker, text);
  if (!answer) return NextResponse.json({ ok: true, agent: "recorder", jobId: job.id, replied: false });
  await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text: answer });
  return reply(answer, "recorder", job.id);
}
