// OWNER: Sunny (AI). Tool "stop_job".
import { tool } from "@/lib/agents/voiceTool";
import { stopGuide } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("stop_job", (i) => stopGuide(i.caseId));
export const GET = POST;
