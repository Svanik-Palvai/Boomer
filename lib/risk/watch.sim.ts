// OWNER: Zohaib. Checks the supervisor flags on the demo job. Run: npx tsx --tsconfig tsconfig.json lib/risk/watch.sim.ts
import { applyCheck, confirmSpoken, startGuiding } from "@/lib/agent/engine";
import { demoJob } from "@/lib/mock/demo";
import { sheetRows } from "@/lib/record/sheet";
import { stepWeights, type WatchWorker } from "@/lib/risk/watch";

let fails = 0;
const expect = (ok: boolean, msg: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) fails++;
};
const flagged = (job: ReturnType<typeof demoJob>, w: WatchWorker) => sheetRows(job, w).filter((r) => r.watch).map((r) => r.order);
const NEW: WatchWorker = { experience: "new" };
const PRO: WatchWorker = { experience: "journeyman" };
const check = (outcome: "pass" | "fail" | "unclear") => ({ outcome, say: "", frameId: "f" });

const start = startGuiding(demoJob());
const w = stepWeights(start);
console.log("weights:", start.steps.map((s) => `${s.order}:${w[s.id]}`).join("  "));
expect(start.steps.filter((s) => s.hardGate).every((s) => w[s.id] === "high"), "both hard gates weigh high");
expect(w["gfci-3-remove"] === "routine", "pulling the old device is routine");

expect(flagged(start, PRO).length === 0, "journeyman on step 1: nothing flagged");
expect(flagged(start, NEW).join() === "1", "new worker on step 1: step 1 flagged");

let job = confirmSpoken(confirmSpoken(start, "it's off"), "reads zero");
expect(flagged(job, PRO).length === 0, "journeyman past both gates: nothing flagged");
expect(flagged(job, NEW).join() === "1,2", "new worker past both gates on their word: steps 1 and 2 stay flagged");

job = applyCheck(applyCheck(job, check("pass")), check("pass")); // steps 3, 4 seen
job = applyCheck(job, check("fail")); // wires on LOAD
expect(flagged(job, PRO).join() === "5", "journeyman misses the LINE step: step 5 flagged");
job = applyCheck(job, check("pass"));
expect(flagged(job, PRO).length === 0, "LINE step fixed and seen: flag clears");

expect(flagged(startGuiding(demoJob()), { experience: "new", mastery: { "gfci-1-breaker": { p: 0.95 }, "de-energize": { p: 0.95 } } }).length === 0, "new worker Boomer has seen get step 1 right: not flagged");
expect(flagged({ ...start, jobType: "unknown-job" }, NEW).length === 0, "job type with no risk model: nothing flagged");

console.log(fails ? `\n${fails} FAILED` : "\nWATCH FLAGS OK");
process.exit(fails ? 1 : 0);
