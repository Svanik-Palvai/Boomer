// OWNER: Pitch presentation. Evidence mapped to the current scaffold, not live-service or prize claims.
export const agents = [
  {
    id: "guide",
    name: "Guide agent",
    channel: "PHOTON VOICE / ELEVENLABS",
    verb: "Sees the job. Guides the next step.",
    description:
      "A Photon number reaches the ElevenLabs voice agent over SIP. Its server tools read the current job, request Gemini vision checks and return one line to speak. The step engine decides when work can advance.",
    input: "Worker, on the call",
    request: "Done. Check that.",
    response:
      "Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE.",
    memory: "Current step + observations + call history",
    tools: ["get_context", "look", "check_step", "repeat_step", "finish_job"],
    source: "lib/agent/tools.ts",
    detail:
      "9 voice tools · caller-to-job matching · resume after a dropped call",
  },
  {
    id: "signup",
    name: "Signup agent",
    channel: "PHOTON IMESSAGE / ONBOARDING",
    verb: "Gets the worker into the system.",
    description:
      "An unknown number enters a text onboarding workflow. Gemini extracts only the name, home location and experience the worker provides; a parser fallback keeps setup usable when AI is unavailable.",
    input: "New worker, by text",
    request: "I’m Alex, based in Philadelphia, PA. Journeyman.",
    response:
      "Example outcome: a worker profile with a home jurisdiction and experience level, ready for the next job.",
    memory: "Signup state → worker profile",
    tools: ["extract profile", "ask missing fields", "save worker"],
    source: "lib/agents/signup.ts",
    detail: "Incremental onboarding · no guessed fields · cancel supported",
  },
  {
    id: "recorder",
    name: "Recorder agent",
    channel: "PHOTON IMESSAGE / GEMINI",
    verb: "Keeps the conversation in context.",
    description:
      "Answers texts using the same job state, steps and memory as the voice workflow. Gemini produces a short reply grounded in that context; guarded fallbacks handle missing configuration or model failures.",
    input: "Worker, in the same thread",
    request: "Where did we leave off?",
    response:
      "Example response: the current step and its recorded context—not a second, disconnected job plan.",
    memory: "Shared job memory + past work records",
    tools: ["recall job", "read steps", "ground reply", "remember exchange"],
    source: "lib/agents/recorder.ts",
    detail:
      "Voice and text share job context · observations remain distinct from confirmations",
  },
  {
    id: "share",
    name: "Sharing agent",
    channel: "PHOTON TEXT / MINI APPS",
    verb: "Brings in the people the worker asks for.",
    description:
      "Explicit worker commands save a supervisor, send a requested update, or share a job/work-record sheet. Photon 1.0 mini-app cards can update in place; link and forwardable-message fallbacks handle delivery limits.",
    input: "Worker, by text",
    request: "Send me my record card.",
    response:
      "Example outcome: the worker receives their portable record sheet to inspect or forward. Supervisor updates require the worker’s request.",
    memory: "Worker contacts + shared job state",
    tools: [
      "save contact",
      "send job card",
      "share record",
      "update sent cards",
    ],
    source: "lib/agents/share.ts",
    detail:
      "Worker-requested sharing · 1.0 cards / link fallback · no unsolicited supervisor outreach",
  },
] as const;
export type AgentId = (typeof agents)[number]["id"];
export const voiceTools = [
  "get_context",
  "look",
  "next_step",
  "repeat_step",
  "explain_step",
  "go_back",
  "check_step",
  "stop_job",
  "finish_job",
] as const;
export const tracks = [
  {
    id: "voice",
    short: "Photon · Voice",
    name: "Photon Best Voice Agent",
    headline: "The phone call is the product.",
    intro:
      "A Photon number connects the electrician to a tool-using ElevenLabs voice agent. Camera evidence and the call meet in one backend-owned job.",
    chain: [
      "Photon number",
      "SIP",
      "ElevenLabs agent",
      "9 server tools",
      "Shared job state",
    ],
    evidence: [
      [
        "Hands-free control",
        "Repeat, explain, go back, check and stop are real server-tool paths—not UI-only animations.",
      ],
      [
        "A bounded visual check",
        "Recent camera frames feed one Gemini check. Stale evidence and unclear views cannot silently become a positive observation.",
      ],
      [
        "A call that resumes",
        "Caller matching and job memory recover the open step. Post-call evidence and pick-up text preserve context.",
      ],
    ],
    inspect:
      "Ask us to repeat a step, catch the staged LOAD mistake, then hang up and resume the same job.",
    source: "lib/agent/tools.ts",
    link: "#correction",
    linkLabel: "See the correction replay",
    note: "Live calls require the team’s configured Photon/SIP/ElevenLabs deployment.",
  },
  {
    id: "imessage",
    short: "Photon · iMessage",
    name: "Photon iMessage Track",
    headline: "One job. Across the call and the thread.",
    intro:
      "Photon 2.0 carries voice and text integration. Three routed text-agent workflows handle onboarding, job-context replies and requested sharing; Photon 1.0 supplies the iMessage mini-app cards.",
    chain: [
      "Inbound text",
      "Agent router",
      "Shared memory",
      "Reply / record",
      "1.0 mini-app card",
    ],
    evidence: [
      [
        "Vision + craft",
        "A voice-led field workflow that returns a usable job record to the worker’s messages.",
      ],
      [
        "Depth",
        "Signup, recorder and sharing workflows; signed webhooks; deduplication; job memory; card updates and delivery fallbacks.",
      ],
      [
        "Mini apps, explicitly",
        "Live job sheets and portable work-record sheets are implemented as Photon 1.0 cards. They are not represented as a 2.0 card API.",
      ],
    ],
    inspect:
      "Text to onboard, ask about the current step, request a record card, and inspect the mini-app sheets. Traction numbers are not claimed without verified live usage.",
    source: "lib/photon/miniapp.ts",
    link: "/demo#sheets",
    linkLabel: "Open the mini-app demo links",
    note: "Shared-line restrictions and provider configuration affect delivery; links/forwardable messages are explicit fallbacks.",
  },
  {
    id: "gemini",
    short: "MLH · Gemini",
    name: "MLH Best Use of Gemini",
    headline: "Vision that has a specific job to do.",
    intro:
      "Gemini reads camera evidence for job identification and individual step checks. It also supports grounded text replies, profile extraction and call/job summaries.",
    chain: [
      "Recent frames",
      "One step question",
      "Gemini vision",
      "Validated result",
      "Engine decision",
    ],
    evidence: [
      [
        "Multimodal input",
        "The real implementation sends image parts from the harness camera alongside the current visual question.",
      ],
      [
        "Structured decisions",
        "The checker returns looks right, not yet, or unclear through the existing contract. The model does not create or approve a new installation procedure.",
      ],
      [
        "AI across the workflow",
        "Identification, checks, summaries, onboarding extraction and context-grounded replies each have a defined role and a fallback.",
      ],
    ],
    inspect:
      "Show the staged wrong-terminal view, then the corrected view. Compare the check response with the source image and recorded outcome.",
    source: "lib/ai/checkStep.ts",
    link: "#correction",
    linkLabel: "Inspect the vision example",
    note: "Mock mode uses preloaded AI checks. Live Gemini calls require USE_MOCKS=false and the team’s configured key.",
  },
  {
    id: "amazon",
    short: "Amazon · Practical AI",
    name: "Amazon Best Practical AI",
    headline: "Practical AI, with a field workflow around it.",
    intro:
      "The target user has occupied hands, a noisy job site and a new jurisdiction to understand. The prototype connects a phone, voice, visual evidence and a portable record around that concrete task.",
    chain: [
      "Worker need",
      "Camera + voice",
      "Grounded AI check",
      "Actionable correction",
      "Owned record",
    ],
    evidence: [
      [
        "Creativity + usefulness",
        "A chest-mounted phone gives a voice agent visual context while keeping the worker in the workflow.",
      ],
      [
        "Technical implementation",
        "A shared job state connects tool calls, bounded checks, official regional references, memory and records.",
      ],
      [
        "UX + documentation",
        "Repeat/why/go-back controls, camera fallbacks, an inert-prop walkthrough and setup documentation make the prototype inspectable.",
      ],
    ],
    inspect:
      "Walk the whole staged job, from harness setup to the work record. Inspect the documented limits and fallbacks, not just a model reply.",
    source: "docs/setup-backend.md",
    link: "/demo",
    linkLabel: "Run the product walkthrough",
    note: "This is the Practical AI judging angle from the team brief; it is not a claim that Boomer uses AWS services.",
  },
  {
    id: "peri",
    short: "Peri · Field need",
    name: "Peri Forward Deployed",
    headline: "Built around the work, then checked in the field.",
    intro:
      "The product focuses on an electrician moving between jurisdictions: local context in the call, a usable correction and a record the worker can take to the next employer.",
    chain: [
      "Business need",
      "Field workflow",
      "Usable prototype",
      "Consultation evidence",
    ],
    evidence: [
      [
        "Real-world need",
        "The state-line workflow is grounded in official jurisdiction sources and a concrete GFCI demonstration.",
      ],
      [
        "Usability + execution",
        "A phone and harness, short voice instructions, explicit unknowns and a portable record are implemented in the scaffold.",
      ],
      [
        "Business evidence",
        "The team reports consultations with the companies shown in the industry rail. Individual interviewees, roles, quotes and evidence links will be added; no endorsement is implied.",
      ],
    ],
    inspect:
      "Inspect the field workflow and regional sources. Consultations are reported by the team; the individual evidence entries remain to be attached.",
    source: "data/RESEARCH-AND-HANDOFF.md",
    link: "#borders",
    linkLabel: "Review the regional workflow",
    note: "Consultations reported by team · interview details and evidence links coming later. Sponsor briefing requirements should be confirmed with the sponsor representative.",
  },
  {
    id: "business",
    short: "Business & Enterprise",
    name: "Business & Enterprise · Main Track",
    headline: "Keep experience useful across the next state line.",
    intro:
      "Boomer’s operating-system pitch starts with electricians: bring job guidance, regional references and a shareable work history into the same workflow.",
    chain: [
      "New jurisdiction",
      "Local context",
      "Guided work",
      "Portable evidence",
      "Next employer",
    ],
    evidence: [
      [
        "A defined first user",
        "The same engine supports a new electrician and an experienced journeyman; their talk profile changes the explanation, not the required checks.",
      ],
      [
        "A connected product",
        "Location confirmation, source-backed jurisdiction data, visual observations and job history stay attached to the worker’s job.",
      ],
      [
        "A record with clear limits",
        "Observations and confirmations are distinct. A portable work record does not transfer a license or certify electrical work.",
      ],
    ],
    inspect:
      "Follow the Philadelphia-to-Princeton journey, run the staged job and inspect what the worker can share afterward.",
    source: "lib/record/buildEntry.ts",
    link: "#record",
    linkLabel: "See the portable record",
    note: "No customer, revenue, adoption or automatic licensing claims are made by the demo.",
  },
] as const;
