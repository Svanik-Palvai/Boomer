// OWNER: Zohaib. Sends one text through Photon 2.0 to prove the line works.
//   npm run photon-test -- +12155550123 "hello from Boomer"
// Reads PHOTON_API_KEY / PHOTON_PROJECT_ID / PHOTON_NUMBER (or PHOTON_AGENT_HANDLE) from .env / .env.local.
import { existsSync, readFileSync } from "node:fs";
import { Photon } from "@photon-ai/api";

for (const f of [".env", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const [to, text = "Boomer test: your Photon line works."] = process.argv.slice(2);
const key = process.env.PHOTON_API_KEY;
const project = process.env.PHOTON_PROJECT_ID;
const agent = process.env.PHOTON_AGENT_HANDLE || process.env.PHOTON_NUMBER;
const platform = process.env.PHOTON_TEXT_PLATFORM || "imessage";
if (!to || !key || !project || !agent) {
  console.error('Usage: npm run photon-test -- +1XXXXXXXXXX "message"   (needs PHOTON_API_KEY, PHOTON_PROJECT_ID, PHOTON_NUMBER)');
  process.exit(1);
}

const photon = new Photon({ headers: { Authorization: `Bearer ${key}` } });
const t0 = Date.now();
try {
  const a = await photon.projects.createOrGetUser({ path: { id: project }, body: { handle: agent, platform } });
  console.log(`agent ${agent}: kind=${a.kind ?? "?"}`);
  const h = await photon.projects.createOrGetUser({ path: { id: project }, body: { handle: to, platform } });
  const s = await photon.projects.createOrGetSpace({
    path: { id: project },
    headers: { "idempotency-key": `boomer-dm:${a.id}:${h.id}` },
    body: { participantIds: [a.id, h.id], platform },
  });
  const m = await photon.projects.sendMessage({
    path: { id: project },
    headers: { "idempotency-key": `boomer-test:${Date.now()}` },
    body: { spaceId: s.id, senderId: a.id, content: { type: "text", format: "plain", text } },
  });
  console.log(`Accepted (${m.status}) in ${Date.now() - t0} ms. Check the phone.`);
} catch (e) {
  console.error("Photon error:", e.status ?? "", e.body?.code ?? e.code ?? "", e.body?.detail ?? e.message);
  process.exitCode = 1;
}
