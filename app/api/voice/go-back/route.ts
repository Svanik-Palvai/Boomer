// OWNER: Sunny (AI). Tool "go_back".
import { tool } from "@/lib/agents/voiceTool";
import { goBack } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("go_back", (i) => goBack(i.caseId));
export const GET = POST;
