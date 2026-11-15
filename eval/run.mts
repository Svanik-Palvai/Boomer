// OWNER: Zohaib. Scores one vision model on the step-check test images, through the real checkStep() (same prompt,
// same timeout as the product). One model per process because VISION_MODEL is read at import.
//   VISION_MODEL=gemini-3.5-flash npx tsx --tsconfig tsconfig.json eval/run.mts
// Writes eval/results/<model>.json; eval/report.mjs compares the files.
import fs from "node:fs";
import path from "node:path";

type Label = "pass" | "fail" | "unclear";
interface Item { id: string; step: string; label: Label; file: string; variant?: string; truth: Label }

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
    }
  }
}

function items(): Item[] {
  const spec = JSON.parse(fs.readFileSync("eval/scenes.json", "utf8"));
  const base = [...spec.real, ...spec.scenes, ...spec.edits] as { id: string; step: string; label: Label }[];
  const find = (id: string) => [`eval/images/gen/${id}.png`, `eval/images/real/${id}.jpg`].find((p) => fs.existsSync(p));
  const out: Item[] = [];
  const truth = new Map(base.map((b) => [b.id, b.label]));
  for (const b of base) { const f = find(b.id); if (f) out.push({ ...b, file: f, truth: b.label }); }
  const augPath = "eval/images/aug/labels.json";
  if (fs.existsSync(augPath)) {
    for (const a of JSON.parse(fs.readFileSync(augPath, "utf8"))) out.push({ id: a.id, step: a.step, label: a.label, variant: a.variant, truth: truth.get(a.from) ?? a.label, file: `eval/images/aug/${a.id}.jpg` });
  }
  const skip = new Set<string>(fs.existsSync("eval/rejected.json") ? JSON.parse(fs.readFileSync("eval/rejected.json", "utf8")) : []);
  return out.filter((i) => !skip.has(i.id) && !skip.has(i.id.split("--")[0]));
}

/**
 * dangerous = says "looks right" when the work is wrong; missed = a real pass not accepted; cautious = "can't tell" on a fault.
 * `truth` is the label of the original photo: a dim or blurry copy of correct work is labeled "unclear", but "pass" there
 * is still true, so it counts as correct, never dangerous.
 */
function grade(label: Label, got: string, truth: Label): "correct" | "dangerous" | "missed" | "cautious" {
  if (got === label || (got === "pass" && truth === "pass")) return "correct";
  if (got === "pass") return "dangerous";
  if (label === "pass") return "missed";
  return "cautious";
}

(async () => {
  loadEnv();
  process.env.USE_MOCKS = "false";
  const model = process.env.VISION_MODEL || process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  process.env.GEMINI_VISION_MODEL = model; // lib/ai/gemini.ts reads this at import, so set it before importing checkStep
  const { checkStep } = await import("@/lib/ai/checkStep");
  const { VISION_MODEL } = await import("@/lib/ai/gemini");
  if (VISION_MODEL !== model) throw new Error(`checkStep would use ${VISION_MODEL}, not ${model}`);
  // The step check runs as a 3-model panel unless CHECK_PANEL=off; results are named so the two are compared side by side.
  const name = process.env.CHECK_PANEL === "off" ? model : `panel-${model}`;
  const { demoJob } = await import("@/lib/mock/demo");
  const steps = new Map(demoJob().steps.map((s) => [s.id, s]));

  // checkStep turns API errors into "unclear"; watch its error log so quota errors are retried, not scored.
  let lastError = "";
  const origError = console.error;
  console.error = (...a: unknown[]) => { lastError = a.map(String).join(" "); };

  const results = [];
  for (const it of items()) {
    const step = steps.get(it.step)!;
    const mime = it.file.endsWith(".png") ? "image/png" : "image/jpeg";
    const frame = { id: it.id, jobId: "eval", workerId: "eval", at: new Date().toISOString(), image: `data:${mime};base64,${fs.readFileSync(it.file).toString("base64")}` };
    let r, tries = 0;
    for (;;) {
      lastError = "";
      r = await checkStep(step, [frame], 0);
      if (!/429|quota|RESOURCE_EXHAUSTED|503|overloaded/i.test(lastError)) break;
      if (++tries > 2) {
        // Still out of quota after two waits: the key's daily limit is spent. Stop instead of grinding through every image.
        origError(`${model}: out of Gemini quota at ${it.id}. Nothing saved; rerun after the quota resets or with billing on.`);
        process.exit(2);
      }
      await new Promise((res) => setTimeout(res, 20000));
    }
    // In a panel one reviewer failing is just an "unclear" vote; the row is an error only if every reviewer failed.
    const error = lastError && (!r.votes || r.votes.every((v) => v.error)) ? lastError.slice(0, 160) : undefined;
    const row = { id: it.id, truth: it.truth, step: it.step, variant: it.variant ?? "original", label: it.label, got: r.outcome, grade: error ? "error" : grade(it.label, r.outcome, it.truth), ms: r.ms, seen: r.seen, say: r.say, votes: r.votes?.map((v) => `${v.reviewer}:${v.outcome}${v.error ? "!" : ""}`).join(" "), error };
    results.push(row);
    origError(`${name}  ${it.id.padEnd(26)} want ${it.label.padEnd(7)} got ${r.outcome.padEnd(7)} ${String(row.ms).padStart(5)} ms  ${row.grade}${row.votes ? `  [${row.votes}]` : ""}`);
  }
  fs.mkdirSync("eval/results", { recursive: true });
  fs.writeFileSync(path.join("eval/results", `${name}.json`), JSON.stringify({ model, at: new Date().toISOString(), results }, null, 1));
  process.exit(0);
})();
