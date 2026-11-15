// OWNER: Zohaib. Supervisor "approve" by text -> the waiting voice agent continues. Mock mode, in-memory db, no server.
// Run from the repo root: APPROVAL_WAIT_MS=2500 APPROVAL_POLL_MS=200 npx -y tsx lib/jobs/approval.sim.ts
// Drives the real handlers: look (sends the plan) -> Photon 2.0 webhook (the supervisor's reply) -> check_step / next_step.
import { POST as look } from "@/app/api/voice/look/route";
import { POST as checkStep } from "@/app/api/voice/check_step/route";
import { POST as nextStep } from "@/app/api/voice/next_step/route";
import { POST as photonWebhook } from "@/app/api/webhooks/photon/route";
import { createJob, getJob, getWorker, resetDemo } from "@/lib/db";
import { DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { samePhone } from "@/lib/jobs/approval";
import type { VoiceToolResponse } from "@/lib/types";

type H = (r: Request) => Promise<Response>;
let fails = 0;
const expect = (ok: boolean, msg: string) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`);
  if (!ok) fails++;
};
const tool = async (h: H, body: Record<string, unknown> = {}) =>
  (await (await h(new Request("http://x/api", { method: "POST", body: JSON.stringify({ jobId: DEMO_JOB_ID, ...body }) }))).json()) as VoiceToolResponse;
let n = 0;
const text = (payload: unknown) =>
  photonWebhook(new Request("http://x/api/webhooks/photon", { method: "POST", headers: { "webhook-id": `sim-${Date.now()}-${n++}` }, body: JSON.stringify(payload) }));
/** Photon 2.0, apiVersion 2026-07-01: the message sits under data.object. */
const received = (handle: string, t: string) => ({ type: "message.received", data: { object: { id: `m${n}`, status: "received", sentBy: { handle }, content: { type: "text", text: t } } } });

async function main() {
  delete process.env.PHOTON_WEBHOOK_SECRET;
  process.env.DEMO_SUPERVISOR_PHONE = "+12155550100";
  process.env.DEMO_SUPERVISOR_NAME = "Aniketh";

  expect(samePhone("+12155550100", "(215) 555-0100") && samePhone("tel:+1 215 555 0100", "2155550100"), "samePhone: formats match");
  expect(!samePhone("+12155550100", "+12155550199") && !samePhone(undefined, undefined), "samePhone: different / missing don't match");

  console.log("\n1. 2026-07-01 payload, handle in another format, a newer open job on the same worker");
  await resetDemo();
  let r = await tool(look, { note: "swapping this outlet for a GFCI" });
  expect(r.status === "plan_ready" && /Aniketh/.test(r.say), "plan sent to Aniketh, waiting");
  r = await tool(checkStep);
  expect(/waiting on Aniketh/i.test(r.say), "check_step waits while the plan is out");
  // A second open job that's newer than the waiting one (a fresh call or text can open one).
  await new Promise((res) => setTimeout(res, 5));
  await createJob((await getWorker(DEMO_WORKER_ID))!);

  const res = await text(received("+1 (215) 555-0100", "Approve"));
  const body = (await res.json().catch(() => ({}))) as { agent?: string; jobId?: string };
  expect(body.agent === "share" && body.jobId === DEMO_JOB_ID, `webhook routed the reply as a decision (agent=${body.agent})`);
  const job = await getJob(DEMO_JOB_ID);
  expect(job?.approval?.status === "approved", `approval state the voice agent reads is "approved" (got ${job?.approval?.status})`);

  r = await tool(checkStep);
  expect(r.status === "guiding" && r.stepNumber === 1 && /approved the plan/.test(r.say), "check_step continues to step 1 with the decision");
  r = await tool(nextStep);
  expect(r.stepNumber === 1 && !/approved/.test(r.say), "decision told once");

  console.log("\n2. Older payload shape (data itself), a hold");
  await resetDemo();
  await tool(look, { note: "GFCI" });
  await text({ data: { id: "old", sentBy: { handle: "+12155550100" }, content: { type: "text", text: "hold off, wait for the quote" } } });
  r = await tool(nextStep);
  expect(r.status === "plan_ready" && /hold off/i.test(r.say), "hold reaches the voice agent");

  console.log("\n3. Multi-part SMS (content.type group), approve with a note");
  await resetDemo();
  await tool(look, { note: "GFCI" });
  await text({ type: "message.received", data: { object: { id: "grp", sentBy: { handle: "2155550100" }, content: { type: "group", parts: [{ type: "text", text: "approve, but use the 20A GFCI" }] } } } });
  r = await tool(checkStep);
  expect(r.status === "guiding" && /20A GFCI/.test(r.say), "note read, then step 1");

  console.log("\n4. Someone else's 'approve' doesn't decide");
  await resetDemo();
  await tool(look, { note: "GFCI" });
  await text(received("+16095550000", "approve"));
  expect((await getJob(DEMO_JOB_ID))?.approval?.status === "waiting", "still waiting");

  console.log("\n5. A second 'approve' after the decision gets a clear answer, not the sign-up agent");
  await text(received("+12155550100", "approve"));
  const decidedAt = (await getJob(DEMO_JOB_ID))?.approval?.decidedAt;
  const late = (await (await text(received("+12155550100", "approved"))).json().catch(() => ({}))) as { agent?: string };
  expect(late.agent === "share", `answered by the approval agent (agent=${late.agent})`);
  expect((await getJob(DEMO_JOB_ID))?.approval?.decidedAt === decidedAt, "the decision isn't made twice");

  // The agent holds on wait_for_approval; the supervisor's text arrives mid-wait and the call carries on by itself.
  const { POST: waitForApproval } = await import("@/app/api/voice/wait_for_approval/route");
  console.log("\n6. wait_for_approval: approval arrives mid-wait -> step 1 without a prompt from the worker");
  await resetDemo();
  await tool(look, { note: "GFCI" });
  const t0 = Date.now();
  const pending = tool(waitForApproval);
  await new Promise((res) => setTimeout(res, 600));
  await text(received("+12155550100", "approve, but use the 20A GFCI"));
  r = await pending;
  const ms = Date.now() - t0;
  expect(r.status === "guiding" && r.stepNumber === 1 && /20A GFCI/.test(r.say) && /Step 1/.test(r.say), "returns the note, then step 1");
  expect(ms < 2000, `returned within a poll of the text (${ms} ms)`);
  r = await tool(nextStep);
  expect(!/20A/.test(r.say), "note not read twice");

  console.log("\n7. wait_for_approval: no answer -> waiting=true after the window; hold off -> said once");
  await resetDemo();
  await tool(look, { note: "GFCI" });
  r = await tool(waitForApproval);
  expect(r.waiting === true && r.say === "" && r.status === "plan_ready", "times out quietly, still plan_ready");
  const held = tool(waitForApproval);
  await new Promise((res) => setTimeout(res, 300));
  await text(received("+12155550100", "hold off, customer wants a quote"));
  r = await held;
  expect(!r.waiting && /hold off/i.test(r.say) && r.status === "plan_ready", "hold returned, steps not started");

  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  process.exit(fails ? 1 : 0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
