// OWNER: Sunny (AI). Tool "check_step": worker said "done". Body: { caseId, confirmed? }.
import { tool } from "@/lib/agents/voiceTool";
import { checkCurrent } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export const POST = tool("check_step", (i) => checkCurrent(i.caseId, i.confirmed));
export const GET = POST;
