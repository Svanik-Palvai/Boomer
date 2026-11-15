// OWNER: Zohaib. Gate report for the demo job: (1) walk every state a call can reach and check the gate rules,
// (2) simulate what each step is worth. Exits 1 if any rule is broken or the self-test fails.
//   npm run risk            (or: npx tsx --tsconfig tsconfig.json lib/risk/report.sim.ts)
import fs from "node:fs";
import { demoJob } from "@/lib/mock/demo";
import { engineNotes, explore, RULES, type Move } from "@/lib/risk/paths";
import { riskModel, type Range } from "@/lib/risk/model";
import { simulate, type Spread } from "@/lib/risk/simulate";

/**
 * The camera check's measured false-pass rate: of the test images showing wrong work, how many came back
 * "looks right" (eval/run.mts). Returned as a 95% Wilson interval. Null when there are no eval results.
 */
function measuredFalsePass(): (Range & { model: string; wrong: number; passed: number }) | null {
  const dirs = ["eval/results", "eval/results/old"];
  const files = dirs.flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => `${d}/${f}`) : []));
  // The model in use if it has results; otherwise the model that did worst, so the range errs on the cautious side.
  const wanted = process.env.VISION_MODEL || process.env.GEMINI_VISION_MODEL;
  const scored = files
    .map((file) => {
      const { model, results } = JSON.parse(fs.readFileSync(file, "utf8")) as { model: string; results: { label: string; got: string; grade: string }[] };
      const wrongWork = results.filter((r) => r.label === "fail" && r.grade !== "error");
      return { file, model, n: wrongWork.length, k: wrongWork.filter((r) => r.got === "pass").length };
    })
    .filter((s) => s.n > 0);
  const chosen = scored.find((s) => s.model === wanted) ?? scored.sort((a, b) => b.k / b.n - a.k / a.n || b.n - a.n)[0];
  if (!chosen) return null;
  const { file, model, n, k } = chosen;
  const z = 1.96;
  const p = k / n;
  const mid = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return { lo: Math.max(0, mid - half), hi: Math.min(1, mid + half), basis: "eval", note: file, model, wrong: n, passed: k };
}

const x = (n: number) => (n >= 100 ? `${Math.round(n)}x` : n >= 10 ? `${n.toFixed(0)}x` : `${n.toFixed(n < 2 ? 2 : 1)}x`);
const range = (s: Spread) => `${x(s.median)} (${x(s.p5)} to ${x(s.p95)})`;

function main() {
  let failed = false;
  const job = demoJob();
  console.log(`Gate report: ${job.title} (${job.jobType}), ${job.steps.length} steps\n`);

  // ── 1. Every reachable state ──
  const ex = explore(job);
  console.log("1. EVERY PATH A CALL CAN TAKE");
  console.log(`   ${ex.states} distinct job states, ${ex.transitions} moves between them (${ex.doneStates} end in done, ${ex.stoppedStates} in stopped).`);
  console.log(`   That covers ${ex.sequences(20).toLocaleString("en-US")} different sequences of up to 20 tool calls.`);
  for (const rule of RULES) {
    const broken = ex.violations.filter((v) => v.rule === rule.id);
    console.log(`   ${broken.length ? "BROKEN" : "holds "}  ${rule.text}`);
    for (const v of broken) console.log(`           ${v.detail}  <- ${v.path.join(" > ")}`);
  }
  if (ex.violations.length) failed = true;

  // Self-test: break the engine on purpose and make sure the rules notice.
  const skipAhead = (j: typeof job): Move[] => (j.status === "guiding" && j.current < j.steps.length ? [{ name: "injected", apply: (s) => ({ ...s, current: s.current + 1 }) }] : []);
  const caught = new Set(explore(job, skipAhead).violations.map((v) => v.rule));
  const selfTest = ["order", "hard-gate", "seen-only"].every((r) => caught.has(r));
  console.log(`   Self-test (a planted "skip this step" move): ${selfTest ? "caught" : "NOT CAUGHT"} (${[...caught].join(", ")})`);
  if (!selfTest) failed = true;

  console.log(`\n   A finished job can be established in ${ex.profiles.length} ways:`);
  for (const p of ex.profiles) {
    const said = job.steps.filter((s) => p.evidence[s.id] === "said").map((s) => s.order);
    console.log(`     steps ${said.join(", ")} on the worker's word${p.notSeen.length ? ` (${p.notSeen.length} of them a camera step that was never seen)` : ""}; the rest seen on camera`);
  }
  const notes = engineNotes(job);
  if (notes.length) {
    console.log("\n   Worth a look (not rule breaks):");
    for (const n of notes) console.log(`     - ${n}`);
  }

  // ── 2. What each step is worth ──
  const measured = measuredFalsePass();
  const model = riskModel(job.jobType, measured ?? undefined);
  console.log("\n2. WHAT EACH STEP IS WORTH (Monte Carlo)");
  if (!model) {
    console.log(`   No risk model for job type "${job.jobType}".`);
    process.exit(failed ? 1 : 0);
  }
  const assumed = model.hazards.flatMap((h) => [h.present, ...h.barriers.flatMap((b) => Object.values(b.failure))]).filter((r) => r.basis === "assumption").length;
  console.log(`   Inputs: ${assumed} ranges are team assumptions, not measurements (lib/risk/model.ts). Read the results as comparisons, not predictions.`);
  console.log(
    measured
      ? `   Measured input: the camera check passed ${measured.passed} of ${measured.wrong} wrong-work test images (${measured.model}), so its false-pass range is ${(measured.lo * 100).toFixed(1)}% to ${(measured.hi * 100).toFixed(1)}%.`
      : "   No eval results found (run npm run eval), so the camera check's false-pass rate is also an assumption.",
  );

  const scenarios = ex.profiles.filter((p) => p.notSeen.length).map((p) => ({ name: `step${p.notSeen.length > 1 ? "s" : ""} ${p.notSeen.map((id) => job.steps.find((s) => s.id === id)!.order).join(" and ")} confirmed by voice, never seen`, evidence: p.evidence }));
  const sim = simulate(model, job.steps, { scenarios });
  console.log(`   ${sim.runs.toLocaleString("en-US")} runs, seed ${sim.seed}. Figures are the median with the 5th to 95th percentile in brackets.\n`);

  console.log(`   Hazards modelled: ${sim.hazards.map((h) => h.label).join("; ")}.`);
  console.log(`   Weighted risk with no steps asked at all: ${range(sim.unguided)} the design.\n`);

  console.log("   Step  gate   established  if skipped                if it were seen too / only said");
  for (const s of sim.steps) {
    const swap = s.ifSeen ? `seen too: ${range(s.ifSeen)}` : `only said: ${range(s.ifNotSeen!)}`;
    console.log(`     ${String(s.order).padEnd(4)} ${(s.hardGate ? "hard" : "-").padEnd(6)} ${s.designed.padEnd(12)} ${range(s.ifSkipped).padEnd(25)} ${swap}`);
  }
  const ranked = [...sim.steps].sort((a, b) => b.worstSkipShare - a.worstSkipShare).filter((s) => s.worstSkipShare > 0);
  console.log(`\n   Worst single step to skip: ${ranked.map((s) => `step ${s.order} in ${(s.worstSkipShare * 100).toFixed(0)}% of runs`).join(", ")}.`);

  const hard = sim.steps.filter((s) => s.hardGate);
  const soft = sim.steps.filter((s) => !s.hardGate);
  const softWorst = soft.reduce((a, b) => (b.ifSkipped.median > a.ifSkipped.median ? b : a));
  const weakHard = hard.filter((h) => h.ifSkipped.median < softWorst.ifSkipped.median);
  console.log(
    weakHard.length
      ? `   Design check: step ${softWorst.order} is not a hard gate but costs more to skip (${x(softWorst.ifSkipped.median)}) than hard gate step ${weakHard.map((h) => h.order).join(", ")}.`
      : `   Design check: every hard gate costs more to skip than any other step (next worst is step ${softWorst.order} at ${x(softWorst.ifSkipped.median)}).`,
  );
  const bestUpgrade = sim.steps.filter((s) => s.ifSeen).sort((a, b) => a.ifSeen!.median - b.ifSeen!.median)[0];
  if (bestUpgrade && bestUpgrade.ifSeen!.median < 1) console.log(`   Biggest gain available: getting step ${bestUpgrade.order} seen on camera as well as said would bring weighted risk to ${range(bestUpgrade.ifSeen!)} the design.`);
  if (sim.scenarios.length) {
    console.log("\n   The other ways a finished job can be established, against the design:");
    for (const sc of sim.scenarios) console.log(`     ${sc.name}: ${range(sc.ratio)}`);
  }

  console.log(failed ? "\nGATE REPORT FAILED" : "\nGATE RULES HOLD");
  process.exit(failed ? 1 : 0);
}

main();
