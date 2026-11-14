// OWNER: Zohaib. Sends one Photon 1.0 (Stable) iMessage mini app card, to check the PHOTON_STABLE_* credentials.
//   npm run miniapp-test -- +1<your phone> [url]
// Default url: the demo job sheet at NEXT_PUBLIC_APP_URL. Reads .env.local, then .env.
import fs from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const phone = process.argv[2];
const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const url = process.argv[3] || `${base}/m/job/demo-2041`;
if (!phone) {
  console.error("Usage: npm run miniapp-test -- +1<phone> [url]");
  process.exit(1);
}
if (!process.env.PHOTON_STABLE_PROJECT_ID || !process.env.PHOTON_STABLE_PROJECT_SECRET) {
  console.error("Set PHOTON_STABLE_PROJECT_ID and PHOTON_STABLE_PROJECT_SECRET (Photon Stable dashboard → your project). See docs/mini-apps.md.");
  process.exit(1);
}

const { Spectrum, app } = await import("spectrum-ts");
const { imessage } = await import("spectrum-ts/providers/imessage");
const t0 = Date.now();
let sp;
try {
  sp = await Spectrum({
    projectId: process.env.PHOTON_STABLE_PROJECT_ID,
    projectSecret: process.env.PHOTON_STABLE_PROJECT_SECRET,
    providers: [imessage.config()],
  });
} catch (err) {
  console.error("Photon 1.0 rejected the credentials:", String(err?.message ?? err).slice(0, 300));
  process.exit(1);
}
try {
  const im = imessage(sp);
  const space = await im.space.create(await im.user(phone));
  const msg = await space.send(app(url, { live: true }));
  console.log(`Sent mini app card to ${phone} in ${Date.now() - t0} ms (message ${msg?.id ?? "?"}).`);
  console.log(`Card opens: ${url}`);
  console.log("On the phone: tap the card. The first time, iMessage offers to install the Spectrum app.");
} catch (err) {
  console.error("Send failed:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  await sp.stop();
}
