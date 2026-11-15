// OWNER: Zohaib. Checks the skill model: the math, how much Boomer says at each level, and a real call moving the
// estimate through the /api/voice handlers (mock mode, no server needed).
// Run from the repo root: npx -y tsx lib/skills/bkt.sim.ts
import { POST as look } from "@/app/api/voice/look/route";
import { POST as checkStep } from "@/app/api/voice/check_step/route";
import { addFrame, getWorker, resetDemo, saveWorker } from "@/lib/db";
import { readStep } from "@/lib/agent/engine";
import { buildWorkRecord } from "@/lib/record/buildEntry";
import { demoJob, demoWorker, DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { PRIOR, SAID, SEEN, update } from "./bkt";
import { KNOWN, LEARNING, masteryOf, observe } from "./mastery";
import type { VoiceToolResponse, Worker } from "@/lib/types";

// The script fires its checks back to back; the real-call pacing guards in check_step would swallow them.
process.env.RECHECK_MIN_MS = "0";
process.env.STEP_MIN_MS = "0";

let fails = 0;
const expect = (ok: boolean, msg: string) => { console.log(ok ? "   ok:" : "   FAIL:", msg); if (!ok) fails++; };
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
const call = async (h: (r: Request) => Promise<Response>, body: Record<string, unknown> = {}) =>
  (await (await h(new Request("http://x/api", { method: "POST", body: JSON.stringify({ jobId: DEMO_JOB_ID, ...body }) }))).json()) as VoiceToolResponse;
const frame = () => addFrame({ jobId: DEMO_JOB_ID, workerId: DEMO_WORKER_ID, image: "data:image/jpeg;base64,AAAA" });

async function main() {
  console.log("math");
  expect(near(update(0.2, true), 0.6), "0.2, seen right -> 0.60");
  expect(near(update(0.9, false), 0.6), "0.9, seen wrong -> 0.60");
  expect(update(0.2, true, SAID) < update(0.2, true, SEEN), "the worker's word moves it less than the camera");
  expect(update(0.5, true) > 0.5 && update(0.5, false) < 0.5, "right goes up, wrong goes down");
  let p = 0.2; let n = 0;
  while (p < KNOWN) { p = update(p, true); n++; }
  expect(n === 3, `a new worker needs 3 clean camera checks to reach "known" (took ${n})`);
  for (let i = 0; i < 50; i++) p = update(p, true);
  expect(p <= 0.99, "never claims certainty");

  console.log("what Boomer says");
  const job = demoJob({ status: "guiding", current: 2 }); // gfci-3-remove: has a short line
  const step = job.steps[2];
  const fresh: Worker = { ...demoWorker(), experience: "new" };
  const jman: Worker = demoWorker();
  expect(readStep(job, fresh).includes(step.reason), "new worker, no history: step with its reason");
  expect(readStep(job, jman).includes(step.shortText!), "journeyman, no history: the short line");
  let w = fresh;
  for (let i = 0; i < 3; i++) w = observe(w, step, "seen_right");
  expect(readStep(job, w).includes(step.shortText!), "new worker after 3 clean checks: the short line");
  w = observe(jman, step, "seen_wrong");
  expect(masteryOf(w, step.skill!) < KNOWN && readStep(job, w).includes(step.text), "journeyman after a miss: the full step again");
  w = observe(w, step, "seen_wrong");
  expect(masteryOf(w, step.skill!) < LEARNING && readStep(job, w).includes(step.reason), "after two misses: the reason comes back");
  expect(masteryOf(w, "some-other-skill") === PRIOR.journeyman, "other skills are untouched");

  console.log("a real call");
  delete process.env.DEMO_SUPERVISOR_PHONE;
  await resetDemo();
  await call(look, { note: "swapping this outlet for a GFCI" });
  await call(checkStep, { spokenConfirmation: "not yet" });
  expect(!(await getWorker(DEMO_WORKER_ID))?.mastery, "an answer that doesn't confirm moves nothing");
  await call(checkStep, { spokenConfirmation: "yeah it's off" });
  let saved = (await getWorker(DEMO_WORKER_ID))!;
  expect(saved.mastery?.["de-energize"]?.checks === 1 && saved.mastery["de-energize"].seen === 0, "spoken confirmation counted, as said not seen");
  await call(checkStep, { spokenConfirmation: "reads zero, no voltage" });
  await call(checkStep); // no frame -> can't tell
  expect(!(await getWorker(DEMO_WORKER_ID))?.mastery?.["device-removal"], "\"can't tell\" moves nothing");
  await frame(); await call(checkStep);
  await frame(); await call(checkStep);
  await frame(); const miss = await call(checkStep); // mock: wires on LOAD the first time
  saved = (await getWorker(DEMO_WORKER_ID))!;
  const term = saved.mastery?.["device-termination"];
  expect(miss.check?.outcome === "fail" && !!term && term.right === 0 && near(term.p, 0.6), "the caught mistake drops that skill to 0.60");
  await frame(); await call(checkStep);
  saved = (await getWorker(DEMO_WORKER_ID))!;
  expect(saved.mastery!["device-termination"].checks === 2 && saved.mastery!["device-termination"].right === 1, "the fix counts as a second check");

  const rec = buildWorkRecord(saved, []);
  expect(rec.skills!.length === 5 && rec.skills![rec.skills!.length - 1].skill === "device-termination", "the record lists the skills, weakest last");
  const edited = await saveWorker({ id: saved.id, name: "New Name", phone: saved.phone, home: saved.home, experience: saved.experience });
  expect(!!edited.mastery?.["device-termination"], "a profile edit keeps the estimates");
  await resetDemo();
  expect(!(await getWorker(DEMO_WORKER_ID))?.mastery, "demo reset clears them");

  console.log(fails ? `${fails} FAILED` : "ALL OK");
  process.exit(fails ? 1 : 0);
}
main();
