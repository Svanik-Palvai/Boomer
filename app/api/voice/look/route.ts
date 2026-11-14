// OWNER: Sunny (AI). Tool "look": what is in the latest frame ("What am I looking at?").
import { tool } from "@/lib/agents/voiceTool";
import { describeFrame } from "@/lib/ai/look";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
export const POST = tool("look", (i) => describeFrame(i.caseId));
export const GET = POST;
