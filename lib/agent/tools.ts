// OWNER: Sunny. ElevenLabs server tool definitions. Each one POSTs a VoiceToolRequest to /api/voice/<name>.
import type { VoiceToolName } from "@/lib/types";
import { absolute, api } from "@/lib/routes";

export const TOOLS: { name: VoiceToolName; description: string; params?: string[] }[] = [
  { name: "get_context", description: "Job, worker, town, current step and what was said. Call first on every call." },
  { name: "look", description: "Look at the latest camera frames and work out the job.", params: ["note"] },
  { name: "next_step", description: "Read the current step (starts guiding if the plan is ready)." },
  { name: "repeat_step", description: "Repeat the current step word for word." },
  { name: "explain_step", description: "Why this step; names the rule for a New here step." },
  { name: "go_back", description: "Go back to the previous step." },
  { name: "check_step", description: "Worker said done: check the current step.", params: ["spokenConfirmation"] },
  { name: "stop_job", description: "Worker said stop.", params: ["reason"] },
  { name: "finish_job", description: "All steps done: save the record and text the link." },
];

/** Every tool also gets these from ElevenLabs dynamic variables. */
export const DYNAMIC_PARAMS = {
  callerPhone: "{{system__caller_id}}",
  conversationId: "{{system__conversation_id}}",
  jobId: "{{job_id}}",
} as const;

export const toolUrl = (name: VoiceToolName) => absolute(api.voiceTool(name));
