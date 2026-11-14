// OWNER: Zohaib. Safety gate for the step check: fails (exit 1) if any wrong work was called "looks right",
// if too many images errored, or if accuracy fell below the floor. Run after eval/run.mts for the model in use.
//   node eval/gate.mjs                       (model from VISION_MODEL, else the newest results file)
//   MIN_CORRECT=80 node eval/gate.mjs
import fs from "node:fs";
const newest = () => fs.readdirSync("eval/results").filter((f) => f.endsWith(".json"))
  .sort((a, b) => fs.statSync(`eval/results/${b}`).mtimeMs - fs.statSync(`eval/results/${a}`).mtimeMs)[0]?.replace(/\.json$/, "");
const model = process.env.VISION_MODEL || newest();
const minCorrect = Number(process.env.MIN_CORRECT || 75);
const file = `eval/results/${model}.json`;
if (!fs.existsSync(file)) { console.error(`No results for ${model}. Run eval/run.mts first.`); process.exit(1); }
const { results } = JSON.parse(fs.readFileSync(file, "utf8"));
const ok = results.filter((r) => r.grade !== "error");
const dangerous = ok.filter((r) => r.grade === "dangerous");
const correct = Math.round((100 * ok.filter((r) => r.grade === "correct").length) / Math.max(1, ok.length));
const errors = results.length - ok.length;
const problems = [];
if (dangerous.length) problems.push(`${dangerous.length} dangerous pass(es): ${dangerous.map((r) => r.id).join(", ")}`);
if (errors > results.length * 0.05) problems.push(`${errors} of ${results.length} images errored (quota or timeouts); rerun`);
if (correct < minCorrect) problems.push(`${correct}% correct, below the ${minCorrect}% floor`);
console.log(`${model}: ${correct}% correct, ${dangerous.length} dangerous, ${errors} errors on ${results.length} images`);
if (problems.length) { for (const p of problems) console.error(`GATE FAILED: ${p}`); process.exit(1); }
console.log("GATE PASSED");
