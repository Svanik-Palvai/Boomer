// OWNER: Sunny (AI). Tool "why_step": the reason for the current step, in one sentence.
import { tool } from "@/lib/agents/voiceTool";
import { whyStep } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("why_step", (i) => whyStep(i.caseId));
export const GET = POST;
