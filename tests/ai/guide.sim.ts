// OWNER: Sunny (AI). Simulated guided call on demo-2041 in mock mode.
// Run: npx -y tsx tests/ai/guide.sim.ts
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";
import { startGuide, checkCurrent, repeatStep, whyStep, goBack, finishGuide, resetGuide, stopGuide } from "@/lib/agents/guide";
import { putFrame } from "@/lib/ai/frames";
import { contextFor } from "@/lib/memory/store";
import { currentStep } from "@/lib/agents/guide";
const currentStepLine = async () => (await currentStep(DEMO_CASE_ID)).say;

const id = DEMO_CASE_ID;
let fails = 0;
const expect = (ok: boolean, msg: string) => { if (!ok) { fails++; console.log("  FAIL:", msg); } };
const say = (label: string, r: { say: string; result?: string; step?: { number: number } }) =>
  console.log(`[${label}] step=${r.step?.number ?? "-"} result=${r.result ?? "-"} :: ${r.say}`);

async function main() {
  await resetGuide(id);
  let r = await startGuide(id, "new_electrician");
  say("start", r);
  expect(r.step?.number === 1, "starts at step 1");

  r = await checkCurrent(id); say("done w/o yes on gate", r);
  expect(r.step?.number === 1 && r.result === "not_confirmed", "hard gate needs yes");
  r = await checkCurrent(id, true); say("breaker yes", r);
  r = await checkCurrent(id, true); say("tester yes", r);
  expect(r.step?.number === 3, "advanced to step 3");

  r = await checkCurrent(id); say("no frame", r);
  expect(r.result === "unclear" && r.step?.number === 3, "no frame -> unclear");

  putFrame(id, "mock:pass"); r = await checkCurrent(id); say("device out", r);
  r = await repeatStep(id); say("repeat", r);
  r = await whyStep(id); say("why", r);
  putFrame(id, "mock:pass"); r = await checkCurrent(id); say("terminals", r);
  expect(r.step?.number === 5, "on LINE step");

  putFrame(id, "mock:fail Those are the LOAD terminals. Move both wires to the pair marked LINE"); r = await checkCurrent(id); say("wrong terminals", r);
  expect(r.result === "fail" && r.step?.number === 5 && /LOAD/.test(r.say), "catches wrong terminal");
  putFrame(id, "mock:pass"); r = await checkCurrent(id); say("fixed", r);

  putFrame(id, "mock:unclear"); r = await checkCurrent(id); say("unclear 1", r);
  putFrame(id, "mock:unclear"); r = await checkCurrent(id); say("unclear 2", r);
  r = await checkCurrent(id, true); say("confirm", r);
  expect(r.result === "confirmed", "confirm after 2 unclear");

  r = await goBack(id); say("go back", r);
  putFrame(id, "mock:pass"); r = await checkCurrent(id); say("redo", r);

  // simulate dropped call: start again -> resume
  r = await startGuide(id); say("call back", r);
  expect(/Welcome back/.test(r.say), "resume on call back");

  for (let k = 0; k < 12 && r.status !== "done"; k++) {
    putFrame(id, "mock:pass");
    r = await checkCurrent(id, true);
    say("run", r);
  }
  expect(r.status === "done", "job done");
  const fin = await finishGuide(id);
  console.log(JSON.stringify(fin.record?.totals), fin.record?.label);
  expect(!!fin.record && fin.record.totals.corrected >= 1, "record counts correction");
  console.log("\n--- context ---\n" + (await contextFor(id, "field")).slice(0, 1500));

  await resetGuide(id);
  const j = await startGuide(id, "journeyman"); say("journeyman", j);
  expect((j.step?.total ?? 99) < 10, "journeyman plan is shorter");
  await checkCurrent(id, true); await checkCurrent(id, true);
  putFrame(id, "mock:pass"); const jr = await currentStepLine(); console.log("[journeyman step 3]", jr);
  expect(/normal install/.test(jr), "standard steps collapsed");
  const s = await stopGuide(id); say("stop", s);
  expect(s.status === "stopped", "stop works");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
}
main();
