// OWNER: Sunny (AI). Shared wrapper for the ElevenLabs server tools under /api/voice/*.
import { NextResponse } from "next/server";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";
import { getCase } from "@/lib/cases/store";

export interface ToolInput {
  caseId: string;
  confirmed?: boolean;
  profile?: "new_electrician" | "journeyman";
  callerPhone?: string;
  question?: string;
}

/**
 * Every tool accepts GET query params or a JSON body. ElevenLabs sends dynamic variables
 * (caseId, caller phone) in the body. With no caseId we fall back to the demo job.
 * TODO(Z): map callerPhone -> open job once the jobs table exists.
 */
export async function readInput(req: Request): Promise<ToolInput> {
  const q = new URL(req.url).searchParams;
  let body: Record<string, unknown> = {};
  if (req.method !== "GET") {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }
  const pick = (k: string) => (body[k] ?? q.get(k) ?? undefined) as string | boolean | undefined;
  const confirmedRaw = pick("confirmed");
  // The model fills caseId; if it sends something that isn't a real job, use the demo job.
  const asked = String(pick("caseId") || pick("case_id") || DEMO_CASE_ID).trim();
  const caseId = (await getCase(asked)) ? asked : DEMO_CASE_ID;
  return {
    caseId,
    confirmed: typeof confirmedRaw === "boolean" ? confirmedRaw : confirmedRaw === undefined ? undefined : /^(true|yes|1)$/i.test(String(confirmedRaw)),
    profile: (pick("profile") as ToolInput["profile"]) || undefined,
    callerPhone: (pick("callerPhone") || pick("system__caller_id")) as string | undefined,
    question: pick("question") as string | undefined,
  };
}

/** Runs a tool, logs it, and always returns something the agent can say. */
export function tool(name: string, fn: (input: ToolInput) => Promise<unknown>) {
  return async (req: Request) => {
    const t0 = Date.now();
    let input: ToolInput | undefined;
    try {
      input = await readInput(req);
      const out = await fn(input);
      console.log(`[voice:${name}] ${input.caseId} ${Date.now() - t0}ms`);
      return NextResponse.json(out);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[voice:${name}] failed`, input?.caseId, msg);
      return NextResponse.json({ say: "Sorry, I lost that. Say it again.", error: msg }, { status: 200 });
    }
  };
}
