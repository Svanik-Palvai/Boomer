// OWNER: Sunny (AI). ElevenLabs Conversational AI agent config for Boomer.
import { FIELD_AGENT_PROMPT, FIELD_AGENT_TOOLS, FIRST_MESSAGE } from "@/lib/agents/fieldAgent";

/**
 * Builds the agent config with our public URL in every webhook tool.
 * Shape follows ElevenLabs' agent "conversation_config" with webhook (server) tools.
 * Apply it in the ElevenLabs dashboard, or with the SDK:
 *   client.conversationalAi.agents.update(ELEVENLABS_AGENT_ID, { conversationConfig: cfg.conversation_config })
 * (check the field names against the SDK version before running; nothing here calls ElevenLabs.)
 */
export function elevenLabsAgentConfig(baseUrl: string) {
  const url = baseUrl.replace(/\/$/, "");
  return {
    name: "Boomer",
    conversation_config: {
      agent: {
        first_message: FIRST_MESSAGE,
        language: "en",
        prompt: {
          prompt: FIELD_AGENT_PROMPT,
          temperature: 0.2,
          tools: FIELD_AGENT_TOOLS.map((t) => ({
            type: "webhook",
            name: t.name,
            description: t.description,
            response_timeout_secs: t.name === "check_step" || t.name === "look" ? 10 : 5,
            api_schema: {
              url: `${url}${t.path}`,
              method: "POST",
              request_body_schema: {
                type: "object",
                properties: {
                  caseId: { type: "string", description: "Job id. Use the dynamic variable case_id; default demo-2041.", dynamic_variable: "case_id" },
                  ...(t.name === "check_step"
                    ? { confirmed: { type: "boolean", description: "Worker's yes (true) or no (false) to a spoken check. Leave out after a plain 'done'." } }
                    : {}),
                },
                required: ["caseId"],
              },
            },
          })),
        },
      },
      turn: { turn_timeout: 7 },
      tts: { optimize_streaming_latency: 3 },
    },
    platform_settings: {
      // case_id defaults to the demo job until Z maps the caller's number to an open job
      overrides: {},
    },
    dynamic_variables: { case_id: "demo-2041" },
  };
}
