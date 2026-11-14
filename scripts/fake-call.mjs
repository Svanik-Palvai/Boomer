// SHARED. Drives a whole guided call against a running dev server, the way ElevenLabs would.
//   npm run dev            (in one terminal, USE_MOCKS=true)
//   npm run fake-call      (in another)
// Env: BASE=http://localhost:3000  CALLER=+15555550123  (the demo worker's phone)
import { existsSync, readFileSync } from "node:fs";
// Pick up VOICE_TOOL_SECRET etc. from .env / .env.local like Next does.
for (const f of [".env", ".env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = process.env.BASE ?? "http://localhost:3000";
const CALLER = process.env.CALLER ?? "+15555550123";
const WORKER = process.env.WORKER ?? "worker-demo";

// 1x1 grey JPEG so checks have a "fresh frame" in mock mode.
const FRAME =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

async function post(path, body, tool = false) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...(tool && process.env.VOICE_TOOL_SECRET ? { "x-boomer-secret": process.env.VOICE_TOOL_SECRET } : {}) }, body: JSON.stringify(body) });
  return r.json();
}
const frame = () => post("/api/frames", { workerId: WORKER, image: FRAME });
async function tool(name, extra = {}) {
  await frame();
  const res = await post(`/api/voice/${name}`, { callerPhone: CALLER, ...extra }, true);
  console.log(`\n> ${name}${extra.spokenConfirmation ? ` ("${extra.spokenConfirmation}")` : ""}\n  Boomer: ${res.say}`);
  return res;
}

await post("/api/demo/reset", {});
await tool("get_context");
await tool("look", { note: "Kitchen counter outlet, needs to be a GFCI." });
await tool("repeat_step");
await tool("check_step", { spokenConfirmation: "Breaker's off." });
await tool("check_step", { spokenConfirmation: "Tester reads zero." });
await tool("check_step"); // remove old device
await tool("explain_step");
await tool("check_step"); // terminals
await tool("check_step"); // LINE: mock fails the first time
await tool("check_step"); // fixed
const last = await tool("check_step", { spokenConfirmation: "It tripped and reset." });
await tool("finish_job");
console.log(`\nLive view: ${BASE}/job/${last.jobId}\nRecord:    ${BASE}/job/${last.jobId}/record`);
