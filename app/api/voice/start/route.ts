// OWNER: Sunny (AI). Tool "start_job": start the guided job, or resume it at the same step.
import { tool } from "@/lib/agents/voiceTool";
import { startGuide } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("start_job", (i) => startGuide(i.caseId, i.profile));
export const GET = POST;
