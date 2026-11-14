// OWNER: Zohaib (Photon). Photon 1.0 ("Stable", spectrum-ts): all iMessage — texts and mini app cards — from one number.
// Voice stays on Photon 2.0 (its own number, SIP to ElevenLabs). Credentials, from app.photon.codes → project → Settings:
//   PHOTON_STABLE_PROJECT_ID / PHOTON_STABLE_PROJECT_SECRET
//   PHOTON_STABLE_WEBHOOK_SECRET  (Webhooks → Add webhook → /api/webhooks/spectrum; inbound texts)
//   PHOTON_TEXT_VIA=beta          (optional: keep texts on Photon 2.0 and use 1.0 for cards only)
// A card is `app(url, { live: true })`: iMessage shows a bubble from Photon's "Spectrum" iMessage app, and a tap opens
// `url` (our /m pages) inside iMessage. `edit()` updates the same bubble in place, which is how the job card stays live.
// Stable can start a chat (50 new conversations per line per day), so it also reaches people who never texted Boomer.
// The SDK is ESM-only and keeps a connection open, so it's loaded on first use and kept on globalThis (one per server).

const INIT_TIMEOUT_MS = 10_000;
const SEND_TIMEOUT_MS = 10_000;

/* eslint-disable @typescript-eslint/no-explicit-any -- spectrum-ts generics don't survive a dynamic import. */
type Sent = { message: any; phone: string; url: string; at: string };
const g = globalThis as unknown as { __spectrum?: Promise<any>; __cards?: Map<string, Sent> };
const cards = () => (g.__cards ??= new Map());

export function stableConfigured(): boolean {
  return !!process.env.PHOTON_STABLE_PROJECT_ID && !!process.env.PHOTON_STABLE_PROJECT_SECRET;
}

/** True when plain texts should go out on Photon 1.0 too (the default once it's configured). */
export function stableTexting(): boolean {
  return stableConfigured() && process.env.PHOTON_TEXT_VIA !== "beta";
}

async function sdk() {
  const [core, im] = await Promise.all([import("spectrum-ts"), import("spectrum-ts/providers/imessage")]);
  return { app: core.app, Spectrum: core.Spectrum, imessage: im.imessage };
}

async function spectrum(): Promise<any> {
  if (!g.__spectrum) {
    g.__spectrum = (async () => {
      const { Spectrum, imessage } = await sdk();
      return Spectrum({
        projectId: process.env.PHOTON_STABLE_PROJECT_ID!,
        projectSecret: process.env.PHOTON_STABLE_PROJECT_SECRET!,
        providers: [imessage.config()],
        webhookSecret: process.env.PHOTON_STABLE_WEBHOOK_SECRET || undefined,
      });
    })();
    g.__spectrum.catch(() => (g.__spectrum = undefined)); // let the next call retry
  }
  return withTimeout(g.__spectrum, INIT_TIMEOUT_MS, "Photon 1.0 startup");
}

async function dm(phone: string): Promise<any> {
  const sp = await spectrum();
  const { imessage } = await sdk();
  const im = imessage(sp);
  return im.space.create(await im.user(phone));
}

/**
 * Send a mini app card. `key` remembers the bubble so `updateMiniApp(key, …)` can edit it in place later
 * (kept in memory: after a server restart the next update sends a fresh card instead).
 */
export async function sendMiniApp(phone: string, url: string, opts: { key?: string; live?: boolean } = {}): Promise<void> {
  const { app } = await sdk();
  const space = await dm(phone);
  const message = await withTimeout(space.send(app(url, { live: opts.live ?? true })), SEND_TIMEOUT_MS, "mini app send");
  if (opts.key && message) cards().set(opts.key, { message, phone, url, at: new Date().toISOString() });
}

/** Edit a card sent earlier. False when there's nothing to edit (never sent, or the server restarted). */
export async function updateMiniApp(key: string, url: string, live = true): Promise<boolean> {
  const sent = cards().get(key);
  if (!sent) return false;
  const sp = await spectrum();
  const { app } = await sdk();
  await withTimeout(sp.edit(sent.message, app(url, { live })), SEND_TIMEOUT_MS, "mini app update");
  cards().set(key, { ...sent, url });
  return true;
}

/** Keys of cards sent with this prefix, e.g. every card for one job. */
export function cardKeys(prefix: string): string[] {
  return [...cards().keys()].filter((k) => k.startsWith(prefix));
}

/** Plain text over Photon 1.0. Returns the message id. */
export async function sendStableText(phone: string, text: string): Promise<string> {
  const space = await dm(phone);
  const msg: any = await withTimeout(space.send(text), SEND_TIMEOUT_MS, "Photon 1.0 text");
  return msg?.id ?? "spectrum-msg";
}

/** An inbound iMessage from Photon 1.0: who sent it, what it says, and a way to answer in the same chat. */
export interface StableInbound {
  id: string;
  from: string;
  text: string;
  reply: (text: string) => Promise<void>;
}

/**
 * Verify and parse one Photon 1.0 webhook delivery (X-Spectrum-Signature, checked against PHOTON_STABLE_WEBHOOK_SECRET).
 * `onText` runs after the response is computed and isn't awaited by the SDK; on a long-running server that's fine.
 */
export async function handleStableWebhook(req: Request, onText: (m: StableInbound) => Promise<void>): Promise<Response> {
  const sp = await spectrum();
  return sp.webhook(req, async (space: any, message: any) => {
    if (message?.direction !== "inbound" || message?.sender?.kind === "agent") return;
    const c = message.content;
    if (c?.type !== "text" || !c.text || !message.sender?.id) return;
    await onText({
      id: message.id,
      from: message.sender.id,
      text: c.text,
      reply: async (text: string) => void (await withTimeout(space.send(text), SEND_TIMEOUT_MS, "Photon 1.0 reply")),
    });
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${what} timed out after ${ms} ms`)), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}
