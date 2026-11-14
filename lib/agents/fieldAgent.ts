// OWNER: Teammate 3 (agents + memory)
/**
 * FIELD AGENT (voice). Talks to the worker on a phone call while their hands are busy.
 * Runs in ElevenLabs, reached through a Photon number over SIP.
 * Before answering, it calls the get_case_context tool -> GET /api/voice/context?caseId=...
 * After the call, ElevenLabs posts the transcript -> POST /api/webhooks/voice (Z), which
 * writes a summary into shared memory.
 *
 * Paste FIELD_AGENT_PROMPT into the ElevenLabs agent's system prompt.
 */
export const FIELD_AGENT_PROMPT = `
You are Boomer, a voice assistant for an electrician who is on a job in an unfamiliar town.
Their hands are busy, so keep answers to one or two short sentences.

Always call get_case_context first. Answer only from the approved plan, the listed sources,
and what the local electrician or manager already said. If the answer is not there, say
"I don't know that one, I'm texting your local reviewer now" and call ask_reviewer.

Never say work is compliant, safe, or code-approved. You can say "the plan says" or
"the local electrician said". If the worker describes something that changes the job
(different box, different breaker, wet location), call ask_reviewer with what they said.
`.trim();

/** Tools the ElevenLabs agent is configured with (server tools pointing at our API). */
export const FIELD_AGENT_TOOLS = [
  { name: "get_case_context", method: "GET", path: "/api/voice/context?caseId={caseId}" },
  { name: "ask_reviewer", method: "POST", path: "/api/voice/ask", body: "{ caseId, question }" },
] as const;
