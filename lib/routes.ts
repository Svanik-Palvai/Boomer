// SHARED. Every page and API path in one place, so a renamed route breaks the build instead of a demo.
import type { VoiceToolName } from "@/lib/types";
import { APP_URL } from "@/lib/config";

/** Pages (Andy). */
export const pages = {
  home: () => "/",
  profile: () => "/profile",
  camera: (workerId: string) => `/camera/${workerId}`,
  liveJob: (jobId: string) => `/job/${jobId}`,
  jobRecord: (jobId: string) => `/job/${jobId}/record`,
  workRecord: (workerId: string) => `/record/${workerId}`,
  miniJob: (jobId: string) => `/m/job/${jobId}`, // [Zohaib] iMessage mini app: live job sheet (Photon 1.0 card)
  miniRecord: (workerId: string) => `/m/record/${workerId}`, // [Zohaib] iMessage mini app: work record sheet
} as const;

/** API routes. Owner in brackets. */
export const api = {
  workers: () => "/api/workers", // [Zohaib] POST create/update profile
  worker: (id: string) => `/api/workers/${id}`, // [Zohaib] GET
  jobs: () => "/api/jobs", // [Zohaib] POST open a job, GET ?workerId=
  job: (id: string) => `/api/jobs/${id}`, // [Zohaib] GET full job (live view polls this)
  latestFrame: (jobId: string) => `/api/jobs/${jobId}/frame`, // [Zohaib] GET latest frame image (?frameId= for one frame)
  jobRecord: (jobId: string) => `/api/jobs/${jobId}/record`, // [Zohaib] GET RecordEntry once the job is closed
  frames: () => "/api/frames", // [Zohaib] POST FrameUpload
  record: (workerId: string) => `/api/records/${workerId}`, // [Zohaib] GET WorkRecord
  stats: () => "/api/stats", // [Zohaib] GET traction numbers
  demoReset: () => "/api/demo/reset", // [Zohaib] POST
  jurisdiction: () => "/api/jurisdiction", // [Aniketh] GET ?lat&lng, POST { jobId, lat, lng } or { jobId, city, state }
  gaps: () => "/api/gaps", // [Aniketh] GET ?from=PA&to=NJ (stretch)
  voiceTool: (tool: VoiceToolName) => `/api/voice/${tool}`, // [Sunny]
  voiceWebhook: () => "/api/webhooks/voice", // [Zohaib] ElevenLabs post-call
  voiceInit: () => "/api/webhooks/voice/init", // [Zohaib] ElevenLabs conversation-initiation
  photonWebhook: () => "/api/webhooks/photon", // [Zohaib] inbound iMessage
  ogJob: (jobId: string) => `/api/og/job/${jobId}`, // [Zohaib] GET link-preview card image for a job record
  ogRecord: (workerId: string) => `/api/og/record/${workerId}`, // [Zohaib] GET link-preview card image for a work record
} as const;

export const absolute = (path: string) => `${APP_URL.replace(/\/+$/, "")}${path}`; // tolerate a trailing "/" in NEXT_PUBLIC_APP_URL
