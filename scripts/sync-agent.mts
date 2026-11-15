// OWNER: Sunny. Brings the live ElevenLabs agent in line with the repo: system prompt (lib/agent/prompt.ts), tool
// timeouts and parameter help (lib/agent/tools.ts), and how long it waits in silence before speaking up.
// The live agent had drifted: an old prompt, 10 s timeouts on the vision tools, and a 7 s silence timeout that made it
// talk over a worker who was busy working.
//
//   npx tsx --tsconfig tsconfig.json scripts/sync-agent.mts            # shows what would change, changes nothing
//   npx tsx --tsconfig tsconfig.json scripts/sync-agent.mts --apply    # writes it to the live agent
//
// Needs ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID (.env.local or .env). Existing tools are edited in place, so their
// URL and secret header stay as they are. A tool that is in the repo but not on the agent is reported, not created.
import fs from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

/** Seconds of silence before the agent speaks up on its own. The worker is working, so as long as the API allows. */
const TURN_TIMEOUT_SECS = Number(process.env.AGENT_TURN_TIMEOUT_SECS || 30);
const API = "https://api.elevenlabs.io/v1/convai";

(async () => {
  const { AGENT_PROMPT } = await import("@/lib/agent/prompt");
  const { elevenLabsTools } = await import("@/lib/agent/tools");
  const key = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!key || !agentId) throw new Error("Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID first.");
  const apply = process.argv.includes("--apply");
  const call = async (path: string, init?: RequestInit) => {
    const r = await fetch(`${API}${path}`, { ...init, headers: { "xi-api-key": key, "content-type": "application/json" } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${init?.method ?? "GET"} ${path}: ${r.status} ${JSON.stringify(body).slice(0, 300)}`);
    return body;
  };

  const agent = await call(`/agents/${agentId}`);
  const live = agent.conversation_config?.agent?.prompt ?? {};
  const turn = agent.conversation_config?.turn ?? {};
  // The live prompt ends with the worker line (dynamic variables); keep whatever follows the safety line there.
  const tail = "\n\nWorker: {{worker_name}}. Talk profile: {{talk_profile}}";
  const wanted = AGENT_PROMPT + tail;

  const changes: string[] = [];
  if ((live.prompt ?? "").trim() !== wanted.trim()) changes.push(`prompt: ${(live.prompt ?? "").length} -> ${wanted.length} characters`);
  if (turn.turn_timeout !== TURN_TIMEOUT_SECS) changes.push(`silence before the agent speaks up: ${turn.turn_timeout} s -> ${TURN_TIMEOUT_SECS} s`);

  const repoTools = elevenLabsTools(process.env.NEXT_PUBLIC_APP_URL ?? "");
  const toolPatches: { id: string; name: string; config: Record<string, unknown> }[] = [];
  const liveNames = new Set<string>();
  for (const id of (live.tool_ids ?? []) as string[]) {
    const t = await call(`/tools/${id}`);
    const cfg = t.tool_config ?? {};
    liveNames.add(cfg.name);
    const want = repoTools.find((x) => x.name === cfg.name);
    if (!want) continue;
    const next = structuredClone(cfg);
    const notes: string[] = [];
    if (cfg.response_timeout_secs !== want.response_timeout_secs) {
      next.response_timeout_secs = want.response_timeout_secs;
      notes.push(`timeout ${cfg.response_timeout_secs} s -> ${want.response_timeout_secs} s`);
    }
    if (cfg.description !== want.description) {
      next.description = want.description;
      notes.push("description");
    }
    const liveProps = next.api_schema?.request_body_schema?.properties ?? {};
    for (const [param, spec] of Object.entries(want.api_schema.request_body_schema.properties)) {
      if (liveProps[param] && liveProps[param].description !== spec.description) {
        liveProps[param].description = spec.description;
        notes.push(`${param} help`);
      }
    }
    if (notes.length) {
      changes.push(`tool ${cfg.name}: ${notes.join(", ")}`);
      toolPatches.push({ id, name: cfg.name, config: next });
    }
  }
  const missing = repoTools.filter((t) => !liveNames.has(t.name)).map((t) => t.name);

  console.log(changes.length ? changes.map((c) => `  ${c}`).join("\n") : "  The live agent already matches the repo.");
  if (missing.length) console.log(`\n  Not on the agent yet (add in the ElevenLabs dashboard, copying another tool's URL base and secret header): ${missing.join(", ")}`);
  if (!apply) return console.log("\nNothing changed. Run again with --apply to write this to the live agent.");

  if (changes.some((c) => c.startsWith("prompt") || c.startsWith("silence"))) {
    await call(`/agents/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify({ conversation_config: { agent: { prompt: { prompt: wanted } }, turn: { turn_timeout: TURN_TIMEOUT_SECS } } }),
    });
    console.log("\nagent updated");
  }
  for (const p of toolPatches) {
    await call(`/tools/${p.id}`, { method: "PATCH", body: JSON.stringify({ tool_config: p.config }) });
    console.log(`tool ${p.name} updated`);
  }
})().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
