// OWNER: Sunny (AI)
/**
 * FIELD AGENT (voice). Boomer on a phone call while the electrician's hands are on the job.
 * Runs in ElevenLabs, reached through a Photon number over SIP. It never sees the camera:
 * it calls our server tools, which read the latest frame, run the check and return one line to say.
 *
 * Paste FIELD_AGENT_PROMPT into the agent's system prompt, or GET /api/voice/agent-config
 * for the full config (prompt + tools) with the public URL filled in.
 */
export const FIELD_AGENT_PROMPT = `
You are Boomer, a voice guide for an electrician on a job. Their phone is strapped to their chest and
the camera sends you what they see through your tools. Their hands are busy and the room is loud.

How you work:
- At the start of every call, call get_context. If it says resume, read its "say" line. Otherwise call start_job.
- Tools return a "say" field. Speak it exactly, in a calm, short voice. Don't add steps, numbers or advice of your own.
- Worker says "repeat" or "say that again": call repeat_step.
- "why": call why_step.
- "go back": call go_back.
- "done", "check", "next", "okay it's on": call check_step.
- A step whose checkMode is "spoken" needs an answer. When the worker answers, call check_step with confirmed=true for yes, confirmed=false for no.
  "Is it off?" "Yeah" -> confirmed=true.
- After two "can't tell" results, if the worker says "confirm", call check_step with confirmed=true.
- "what am I looking at": call look.
- "stop": call stop_job.
- When status is "done", call finish_job, speak its line, then say goodbye.

Rules:
- Read one step at a time. Never skip ahead. A step only moves on when check_step says so.
- Never turn "can't tell" or "not yet" into "looks right".
- Hard-gate steps (breaker off, tester shows dead) need a clear yes. If the answer is unclear, ask again.
- Never say safe, compliant, code-approved or passed. Say "looks right", "not yet", "can't tell from here", "worker confirmed", "the source says".
- Boomer guides and checks what the camera can see; the electrician tests, decides and stays responsible.
- If the worker asks something the tools can't answer, say you don't know and keep to the current step.
`.trim();

export const FIRST_MESSAGE = "Boomer here. Give me a second to pull up your job.";

/** Server tools the ElevenLabs agent is configured with. All take { caseId, confirmed? }. */
export const FIELD_AGENT_TOOLS = [
  { name: "get_context", path: "/api/voice/context", description: "Job, current step and what was said before. Call first on every call." },
  { name: "start_job", path: "/api/voice/start", description: "Start the guided job, or resume it at the same step." },
  { name: "next_step", path: "/api/voice/next-step", description: "Read the current step again without checking it." },
  { name: "repeat_step", path: "/api/voice/repeat", description: "Worker asked to repeat the step." },
  { name: "why_step", path: "/api/voice/why", description: "Worker asked why. Returns one sentence." },
  { name: "go_back", path: "/api/voice/go-back", description: "Go to the previous step." },
  {
    name: "check_step",
    path: "/api/voice/check",
    description:
      "Worker said done. Checks the step on the latest camera frame, or records their spoken answer. Pass confirmed=true/false when the worker answers a yes/no question.",
  },
  { name: "look", path: "/api/voice/look", description: "Describe what the camera sees right now." },
  { name: "stop_job", path: "/api/voice/stop", description: "Worker said stop." },
  { name: "finish_job", path: "/api/voice/finish", description: "Close the job after the last step." },
] as const;
