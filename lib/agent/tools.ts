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

/** What each tool-specific body field means, for the ElevenLabs tool form (value type: LLM prompt). */
export const PARAM_HELP: Record<string, string> = {
  jobId: "Always the job id from the system prompt (demo-2041 for the demo).",
  note: "What the worker said the job or problem is, in their words.",
  spokenConfirmation: "The worker's exact words when they answer a yes/no question or confirm a spoken step. Leave empty after a plain 'done'.",
  reason: "Why the worker stopped, in their words.",
};

/**
 * ElevenLabs webhook tool configs (POST, JSON body) for every tool, ready to paste or apply.
 * Body: jobId (LLM prompt, required) + the tool's own params. ElevenLabs' form rejects constant-value
 * fields, so jobId is filled by the model from the prompt; resolveJob also falls back on the caller's phone.
 */
export function elevenLabsTools(baseUrl: string) {
  const url = baseUrl.replace(/\/$/, "");
  return TOOLS.map((t) => ({
    type: "webhook" as const,
    name: t.name,
    description: t.description,
    response_timeout_secs: t.name === "check_step" || t.name === "look" ? 10 : 5,
    api_schema: {
      url: `${url}/api/voice/${t.name}`,
      method: "POST",
      request_body_schema: {
        type: "object",
        properties: Object.fromEntries(
          ["jobId", ...(t.params ?? [])].map((p) => [p, { type: "string", description: PARAM_HELP[p] ?? p }]),
        ),
        required: ["jobId"],
      },
    },
  }));
}
