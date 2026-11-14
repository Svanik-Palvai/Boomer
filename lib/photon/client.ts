// OWNER: Zohaib (Photon). Photon 2.0 (beta platform, app.beta.photon.codes) through @photon-ai/api.
import { createHmac, timingSafeEqual } from "crypto";
import { Photon } from "@photon-ai/api";

const env = {
  apiKey: () => process.env.PHOTON_API_KEY,
  project: () => process.env.PHOTON_PROJECT_ID,
  /** The project's line that sends the record (E.164). Defaults to the voice number. */
  agentHandle: () => process.env.PHOTON_AGENT_HANDLE || process.env.PHOTON_NUMBER,
  /** "imessage" (default) or "sms" if the line is an SMS number. */
  platform: () => process.env.PHOTON_TEXT_PLATFORM || "imessage",
};

/** True when the credentials needed for real texts are present. */
export function photonConfigured(): boolean {
  return !!env.apiKey() && !!env.project() && !!env.agentHandle();
}

const g = globalThis as unknown as { __photon?: Photon; __photonIds?: Map<string, string> };
const client = () => (g.__photon ??= new Photon({ headers: { Authorization: `Bearer ${env.apiKey()}` } }));
const ids = () => (g.__photonIds ??= new Map());

async function userId(handle: string): Promise<string> {
  const key = `user:${env.platform()}:${handle}`;
  const cached = ids().get(key);
  if (cached) return cached;
  const u = (await client().projects.createOrGetUser({
    path: { id: env.project()! },
    body: { handle, platform: env.platform() },
  })) as unknown as { id: string };
  ids().set(key, u.id);
  return u.id;
}

async function dmSpace(agentId: string, humanId: string): Promise<string> {
  const key = `space:${agentId}:${humanId}`;
  const cached = ids().get(key);
  if (cached) return cached;
  const s = (await client().projects.createOrGetSpace({
    path: { id: env.project()! },
    headers: { "idempotency-key": `boomer-dm:${agentId}:${humanId}` },
    body: { participantIds: [agentId, humanId], platform: env.platform() },
  })) as unknown as { id: string };
  ids().set(key, s.id);
  return s.id;
}

/**
 * Text one person from the project's line. Returns the Photon message id.
 * `dedupeKey` makes retries safe (same key = same message, never sent twice).
 * NOTE: a SHARED iMessage line can only reply after the person has texted it first (SHARED_LINE_INBOUND_REQUIRED).
 * A dedicated line or an SMS number can text first.
 */
export async function sendPhotonText(phone: string, text: string, dedupeKey: string): Promise<string> {
  const agentId = await userId(env.agentHandle()!);
  const humanId = await userId(phone);
  const spaceId = await dmSpace(agentId, humanId);
  const m = (await client().projects.sendMessage({
    path: { id: env.project()! },
    headers: { "idempotency-key": dedupeKey.slice(0, 255) },
    body: { spaceId, senderId: agentId, content: { type: "text", format: "plain", text } },
  })) as unknown as { id: string; status?: string };
  return m.id;
}

/** Readable message from a Photon API error (status + problem code), without leaking credentials. */
export function photonErrorText(err: unknown): string {
  const e = err as { status?: number; code?: string; body?: { code?: string; detail?: string }; message?: string };
  return [e.status, e.body?.code ?? e.code, e.body?.detail ?? e.message].filter(Boolean).join(" ");
}

/**
 * Standard Webhooks verification (what Photon 2.0 signs with). Secret is the destination's "whsec_..." value.
 * Returns true when no secret is configured so local testing works.
 */
export function verifyPhotonWebhook(rawBody: string, headers: Headers, secret = process.env.PHOTON_WEBHOOK_SECRET): boolean {
  if (!secret) return true;
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigs = headers.get("webhook-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest("base64"));
  return sigs.split(" ").some((s) => {
    const [, sig] = s.split(",");
    const got = Buffer.from(sig ?? "");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
