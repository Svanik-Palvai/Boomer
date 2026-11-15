// OWNER: Sunny. Simulated guided call through the real /api/voice/* handlers (mock mode, no server needed).
// Run from the repo root: npx -y tsx lib/agent/call.sim.ts
import { POST as getContext } from "@/app/api/voice/get_context/route";
import { POST as nextStep } from "@/app/api/voice/next_step/route";
import { POST as repeatStep } from "@/app/api/voice/repeat_step/route";
import { POST as explainStep } from "@/app/api/voice/explain_step/route";
import { POST as goBack } from "@/app/api/voice/go_back/route";
import { POST as checkStep } from "@/app/api/voice/check_step/route";
import { POST as finishJob } from "@/app/api/voice/finish_job/route";
import { POST as stopJob } from "@/app/api/voice/stop_job/route";
import { POST as look } from "@/app/api/voice/look/route";
import { handleInboundText } from "@/lib/agents/inbox";
import { addFrame, getJob, resetDemo } from "@/lib/db";
import { DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { BANNED_WORDS } from "@/lib/copy";
import type { VoiceToolResponse } from "@/lib/types";

type H = (r: Request) => Promise<Response>;
let fails = 0;
const expect = (ok: boolean, msg: string) => { if (!ok) { fails++; console.log("   FAIL:", msg); } };
async function call(label: string, h: H, body: Record<string, unknown> = {}): Promise<VoiceToolResponse> {
  const res = (await (await h(new Request("http://x/api", { method: "POST", body: JSON.stringify({ jobId: DEMO_JOB_ID, ...body }) }))).json()) as VoiceToolResponse;
  console.log(`[${label}] step=${res.stepNumber ?? "-"}/${res.stepCount ?? "-"} ${res.check ? res.check.outcome + " " : ""}:: ${res.say}`);
  for (const w of BANNED_WORDS.filter((b) => b !== "safe")) expect(!new RegExp(`\\b${w}\\b`, "i").test(res.say), `banned word "${w}"`);
  return res;
}
const frame = () => addFrame({ jobId: DEMO_JOB_ID, workerId: DEMO_WORKER_ID, image: "data:image/jpeg;base64,AAAA" });

async function main() {
  delete process.env.DEMO_SUPERVISOR_PHONE;
  await resetDemo();
  let r = await call("get_context", getContext);
  expect(!!r.context && r.context.includes("No plan yet"), "fresh demo has no plan");
  r = await call("look (no supervisor)", look, { note: "swapping this outlet for a GFCI" });
  expect(r.stepNumber === 1 && r.status === "guiding", "no supervisor -> guiding at step 1");

  r = await call("done (no words)", checkStep);
  expect(r.stepNumber === 1, "breaker needs words");
  r = await call("'not yet'", checkStep, { spokenConfirmation: "not yet" });
  expect(r.stepNumber === 1, "no does not confirm");
  r = await call("'I think so'", checkStep, { spokenConfirmation: "I think so" });
  expect(r.stepNumber === 1, "vague does not confirm");
  r = await call("'yeah it's off'", checkStep, { spokenConfirmation: "yeah it's off" });
  expect(r.stepNumber === 2, "breaker confirmed");

  r = await call("'it beeps'", checkStep, { spokenConfirmation: "it beeps and lights up" });
  expect(r.stepNumber === 2 && /voltage/.test(r.say), "live tester rejected");
  r = await call("'reads zero'", checkStep, { spokenConfirmation: "reads zero, no voltage" });
  expect(r.stepNumber === 3, "tester dead confirmed");

  r = await call("done, no frame", checkStep);
  expect(r.stepNumber === 3 && r.check?.outcome === "unclear", "no frame -> unclear");
  await frame(); r = await call("done (remove)", checkStep);
  expect(r.stepNumber === 4, "remove seen");
  r = await call("repeat", repeatStep);
  r = await call("why", explainStep);
  await frame(); r = await call("done (terminals)", checkStep);
  expect(r.stepNumber === 5, "terminals seen");
  await frame(); r = await call("done (wires on LOAD)", checkStep);
  expect(r.check?.outcome === "fail" && /LOAD/.test(r.say) && r.stepNumber === 5, "caught wrong terminals");
  await frame(); r = await call("done (fixed)", checkStep);
  expect(r.stepNumber === 6, "LINE seen after fix");
  r = await call("go back", goBack);
  expect(r.stepNumber === 5, "went back");
  await frame(); r = await call("done again", checkStep);
  r = await call("'it tripped and reset'", checkStep, { spokenConfirmation: "it tripped on test and came back on reset" });
  expect(r.status === "guiding" && r.stepNumber === null, "all steps done");
  r = await call("finish", finishJob);
  expect(r.status === "done", "done");
  const job = await getJob(DEMO_JOB_ID);
  expect(!!job?.recordId, "record saved");
  console.log("memory events:", job?.memory.length);

  await resetDemo(); await call("look", look, { note: "GFCI swap" });
  r = await call("stop", stopJob, { reason: "customer asked us to leave" });
  expect(r.status === "stopped", "stopped");

  // ── Supervisor approval ──
  const BOSS = "+12155550100";
  process.env.DEMO_SUPERVISOR_PHONE = BOSS;
  process.env.DEMO_SUPERVISOR_NAME = "Dana";
  await resetDemo();
  r = await call("look (with supervisor)", look, { note: "swapping this outlet for a GFCI" });
  expect(r.status === "plan_ready" && /Dana/.test(r.say), "plan sent to Dana, waiting");
  r = await call("look again (no resend)", look, { note: "GFCI" });
  expect(r.status === "plan_ready" && /waiting on Dana/i.test(r.say), "second look does not resend the plan");
  r = await call("next_step (waiting)", nextStep);
  expect(r.status === "plan_ready" && /waiting on Dana/i.test(r.say), "still waiting");
  r = await call("check_step (waiting)", checkStep);
  expect(/waiting on Dana/i.test(r.say), "check blocked while waiting");
  r = await call("get_context (waiting)", getContext);
  expect(!!r.context?.includes("waiting on their reply"), "context knows it's waiting");
  const worker = (await import("@/lib/db")).getWorker;
  const w = await worker(DEMO_WORKER_ID);
  const wt = await handleInboundText(w!.phone, "job sheet");
  console.log("[worker text while waiting]", wt.agent, "::", wt.reply);
  expect(wt.agent !== "share" || !/can start/.test(wt.reply ?? ""), "worker text is not a decision");
  const sup = await handleInboundText(BOSS, "Approve, but use the 20A GFCI");
  console.log("[supervisor text]", sup.agent, "::", sup.reply);
  expect(sup.agent === "share" && /can start/.test(sup.reply ?? ""), "supervisor approval parsed");
  r = await call("next_step (approved)", nextStep);
  expect(r.status === "guiding" && r.stepNumber === 1 && /20A GFCI/.test(r.say), "note read, then step 1");
  r = await call("repeat (told once)", repeatStep);
  expect(!/20A/.test(r.say), "note not repeated");
  const sup2 = await handleInboundText(BOSS, "approve");
  expect(sup2.agent !== "share" || !/can start/.test(sup2.reply ?? ""), "late reply is not a second decision");

  await resetDemo();
  await call("look", look, { note: "GFCI" });
  const no = await handleInboundText(BOSS, "Hold off, customer wants a quote first");
  console.log("[supervisor hold]", no.reply);
  r = await call("next_step (held)", nextStep);
  expect(r.status === "plan_ready" && /hold off/i.test(r.say), "held by supervisor");

  await resetDemo();
  await call("look", look, { note: "GFCI" });
  await handleInboundText(BOSS, "yes");
  r = await call("next_step (plain yes)", nextStep);
  expect(r.status === "guiding" && /approved the plan\. Step 1/.test(r.say), "plain approval");
  r = await call("finish early", stopJob, { reason: "test" });
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
}
main().catch((e) => { console.error(e); process.exit(1); });
