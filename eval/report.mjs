// OWNER: Zohaib. Compares every eval/results/*.json: the dangerous column (said "looks right" when it wasn't) matters most.
//   node eval/report.mjs
import fs from "node:fs";
const files = fs.readdirSync("eval/results").filter((f) => f.endsWith(".json"));
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const rows = files.map((f) => {
  const { model, results } = JSON.parse(fs.readFileSync(`eval/results/${f}`, "utf8"));
  const ok = results.filter((r) => r.grade !== "error");
  const n = (g) => ok.filter((r) => r.grade === g).length;
  const ms = ok.map((r) => r.ms);
  return { model, images: ok.length, correct: pct(n("correct"), ok.length), dangerous: n("dangerous"), missed: n("missed"), cautious: n("cautious"), errors: results.length - ok.length, p50: q(ms, 0.5), p95: q(ms, 0.95) };
}).sort((a, b) => a.dangerous - b.dangerous || parseInt(b.correct) - parseInt(a.correct) || a.p50 - b.p50);
console.log("model".padEnd(26), "imgs", "correct", "DANGER", "missed", "cautious", "errors", "p50ms", "p95ms");
for (const r of rows) console.log(r.model.padEnd(26), String(r.images).padStart(4), r.correct.padStart(7), String(r.dangerous).padStart(6), String(r.missed).padStart(6), String(r.cautious).padStart(8), String(r.errors).padStart(6), String(r.p50).padStart(5), String(r.p95).padStart(5));
