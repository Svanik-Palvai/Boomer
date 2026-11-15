// OWNER: Zohaib. Job identification (the "look" tool), old settings vs current: speed and whether it picks the right job.
// Every eval photo is from a GFCI swap, so the right answer is the demo job type. To compare with an older version:
//   git show <commit>:lib/ai/identifyJob.ts > eval/identifyJob.old.ts   (delete it after) Calls alternate old/new so both see the same API load.
//   NOTE="swapping this outlet for a GFCI" N=8 npx tsx --tsconfig tsconfig.json eval/identify.mts   (NOTE = what the worker said; the agent always passes it)
import fs from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}
process.env.USE_MOCKS = "false";

(async () => {
  const { identifyJob } = await import("@/lib/ai/identifyJob");
  const old = fs.existsSync("eval/identifyJob.old.ts") ? (await import("./identifyJob.old")).identifyJob : null;
  const { DEMO_JOB_TYPE } = await import("@/lib/mock/demo");
  const files = [...fs.readdirSync("eval/images/real").map((f) => `eval/images/real/${f}`), ...fs.readdirSync("eval/images/gen").map((f) => `eval/images/gen/${f}`)]
    .filter((f) => /\.(jpe?g|png)$/.test(f))
    .slice(0, Number(process.env.N || 24));
  const runs: Record<string, { ms: number; ok: boolean; fallback: boolean; component: string }[]> = { old: [], new: [] };
  for (const [i, file] of files.entries()) {
    const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
    const frame = { id: file, jobId: "eval", workerId: "eval", at: new Date().toISOString(), image: `data:${mime};base64,${fs.readFileSync(file).toString("base64")}` };
    const order = i % 2 ? (["new", "old"] as const) : (["old", "new"] as const);
    for (const which of order) {
      const fn = which === "old" ? old : identifyJob;
      if (!fn) continue;
      const t = Date.now();
      const r = await fn([frame], process.env.NOTE);
      const row = { ms: Date.now() - t, ok: r.jobType === DEMO_JOB_TYPE && r.source === "gemini", fallback: r.source !== "gemini", component: r.component };
      runs[which].push(row);
      console.log(`${which}  ${file.split("/").pop()!.padEnd(28)} ${String(row.ms).padStart(5)} ms  ${row.ok ? "right job" : row.fallback ? `FALLBACK ${r.fallbackError ?? ""}` : `wrong job (${r.jobType})`}  ${r.component}`);
    }
  }
  const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];
  console.log("");
  for (const [which, rows] of Object.entries(runs)) {
    if (!rows.length) continue;
    const ms = rows.map((r) => r.ms);
    console.log(`${which}: ${rows.filter((r) => r.ok).length}/${rows.length} right job, ${rows.filter((r) => r.fallback).length} fallbacks | p50 ${pct(ms, 50)} ms, p90 ${pct(ms, 90)} ms, max ${Math.max(...ms)} ms`);
  }
  process.exit(0);
})();
