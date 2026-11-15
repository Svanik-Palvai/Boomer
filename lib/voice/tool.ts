// OWNER: Zohaib (shared plumbing for Sunny's /api/voice/* routes)
import { NextResponse } from "next/server";
import type { Job, VoiceToolName, VoiceToolRequest, VoiceToolResponse, Worker } from "@/lib/types";
import { resolveJob } from "@/lib/jobs/resolve";
import { logToolCall, updateJob } from "@/lib/db";
import { stepNumber } from "@/lib/agent/engine";
import { refreshJobCards } from "@/lib/photon/miniapp";

/**
 * ElevenLabs gives look and check_step 10 s (response_timeout_secs, lib/agent/tools.ts). Handlers aim to be done by
 * this long after the request arrived, leaving room for the lastSay write, the tool log, and the network.
 */
export const TOOL_BUDGET_MS = 8000;

/** ms left until `deadline` minus `reserve`, clamped to [min, max]. */
export function budget(deadline: number, { reserve = 0, min = 0, max = Infinity } = {}): number {
  return Math.max(min, Math.min(max, deadline - Date.now() - reserve));
}

export interface ToolCtx {
  req: VoiceToolRequest;
  /** Epoch ms the handler should be finished by (request start + TOOL_BUDGET_MS). */
  deadline: number;
  job: Job;
  worker: Worker;
  resumed: boolean;
}

/**
 * Wraps a voice tool handler: checks VOICE_TOOL_SECRET (header x-boomer-secret), parses the body, matches the call to a job (jobId or caller phone),
 * logs every call with its timing, and turns any error into a short line the agent can say.
 * Handlers return a VoiceToolResponse; job/status/step fields are filled in if missing.
 *
 *   export const POST = voiceTool("repeat_step", async ({ job, worker }) => ({ say: readStep(job, worker) }));
 */
export function voiceTool(name: VoiceToolName, handler: (ctx: ToolCtx) => Promise<VoiceToolResponse & { job?: Job }>) {
  return async function POST(request: Request) {
    const started = Date.now();
    const secret = process.env.VOICE_TOOL_SECRET;
    if (secret && request.headers.get("x-boomer-secret") !== secret) {
      return NextResponse.json({ say: "", error: "unauthorized" }, { status: 401 });
    }
    let body: VoiceToolRequest = {};
    try {
      body = ((await request.json().catch(() => ({}))) ?? {}) as VoiceToolRequest;
    } catch {}

    let res: VoiceToolResponse;
    let jobId: string | undefined;
    try {
      const resolved = await resolveJob({ jobId: body.jobId, callerPhone: body.callerPhone });
      if (!resolved) {
        res = { say: "I can't find your profile. Set it up on the Boomer page first.", error: "no_job" };
      } else {
        jobId = resolved.job.id;
        const out = await handler({ req: body, deadline: started + TOOL_BUDGET_MS, ...resolved });
        const job = out.job ?? resolved.job;
        // A step moved or the status changed: edit any mini app cards already sent for this job (fire-and-forget).
        if (out.job && (out.job.current !== resolved.job.current || out.job.status !== resolved.job.status)) {
          refreshJobCards(out.job).catch(() => {});
        }
        const { job: _omit, ...rest } = out;
        res = {
          jobId: job.id,
          status: job.status,
          stepNumber: stepNumber(job),
          stepCount: job.steps.length,
          ...rest,
        };
      }
    } catch (err) {
      console.error(`[voice:${name}]`, err);
      res = { say: "Something went wrong on my end. Give me a second and say that again.", error: String(err) };
    }

    if (jobId && res.say) {
      const lastSay = { text: res.say, tool: name, at: new Date().toISOString() };
      await updateJob(jobId, (j) => ({ ...j, lastSay })).catch(() => {});
    }
    await logToolCall({ tool: name, jobId, request: body, response: res, ms: Date.now() - started });
    return NextResponse.json(res);
  };
}
