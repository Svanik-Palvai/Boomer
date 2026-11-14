// OWNER: Sunny (AI). Tool "get_context": job, guided-call state and shared memory, read at the start of every call.
import { tool } from "@/lib/agents/voiceTool";
import { contextFor } from "@/lib/memory/store";
import { getCase } from "@/lib/cases/store";
import { stepLine } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";

export const GET = tool("get_context", async (i) => {
  const c = await getCase(i.caseId);
  const g = c?.guide;
  const resume = g && (g.status === "guiding" || g.status === "plan_ready");
  return {
    context: await contextFor(i.caseId, "field"),
    say: resume ? `Welcome back. ${stepLine(g!)}` : undefined,
    resume: !!resume,
  };
});
export const POST = GET;
