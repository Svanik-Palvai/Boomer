// OWNER: Sunny (AI). Tool "finish_job": close the job and return the record for Z's iMessage text.
import { tool } from "@/lib/agents/voiceTool";
import { finishGuide } from "@/lib/agents/guide";
export const dynamic = "force-dynamic";
export const POST = tool("finish_job", (i) => finishGuide(i.caseId));
export const GET = POST;
