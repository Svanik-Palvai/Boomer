// OWNER: Sunny (AI). Tool "next_step": read the current step. Steps only advance through check_step.
import { tool } from "@/lib/agents/voiceTool";
import { currentStep } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("next_step", (i) => currentStep(i.caseId));
export const GET = POST;
