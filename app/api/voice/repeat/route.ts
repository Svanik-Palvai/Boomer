// OWNER: Sunny (AI). Tool "repeat_step".
import { tool } from "@/lib/agents/voiceTool";
import { repeatStep } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("repeat_step", (i) => repeatStep(i.caseId));
export const GET = POST;
