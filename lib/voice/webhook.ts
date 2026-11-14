// OWNER: Zohaib (ElevenLabs webhooks)
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify the ElevenLabs-Signature header ("t=<unix>,v0=<hex hmac of `${t}.${body}`>").
 * Returns true when no secret is configured (local dev) so mocks keep working.
 * TODO(Zohaib): confirm the header format against the ElevenLabs docs for your workspace.
 */
export function verifyElevenLabs(rawBody: string, header: string | null, secret = process.env.ELEVENLABS_WEBHOOK_SECRET): boolean {
  if (!secret) return true;
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t;
  const sig = parts.v0;
  if (!t || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 30 * 60) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
