// OWNER: Lessons feature. Separate contracts; existing Job/Record contracts stay intact.
import { z } from "zod";
import type { Job } from "@/lib/types";
const seconds = z.number().finite().nonnegative();
export const annotationSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1).max(100),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().positive().max(1),
    h: z.number().positive().max(1),
    kind: z.enum(["box", "arrow"]),
  })
  .refine((b) => b.x + b.w <= 1 && b.y + b.h <= 1, "Annotation exceeds image");
export const clipSchema = z
  .object({
    id: z.string().min(1),
    recordingId: z.string().min(1),
    callId: z.string().min(1),
    stepId: z.string().min(1),
    start: seconds,
    end: seconds,
    caption: z.string().max(1000),
    kind: z.enum(["action", "mistake", "correction", "worker_confirmation"]),
    freezeAt: seconds.optional(),
    freezeSeconds: z.number().min(0).max(8).default(0),
    annotations: z.array(annotationSchema).max(12),
    audioOffset: z.number().finite().min(-3600).max(3600),
  })
  .refine(
    (c) => c.end > c.start && c.end - c.start <= 300,
    "Invalid clip interval",
  )
  .refine(
    (c) =>
      !c.annotations.length ||
      (c.freezeAt !== undefined && c.freezeSeconds > 0),
    "Annotations require a freeze frame",
  )
  .refine(
    (c) =>
      c.freezeAt === undefined || (c.freezeAt >= c.start && c.freezeAt < c.end),
    "Freeze outside clip",
  );
export const editSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000),
  clips: z.array(clipSchema).min(1).max(50),
  issues: z.array(z.string().min(1).max(300)).max(30),
  captionEdits: z
    .array(
      z.object({
        callId: z.string().min(1),
        turn: z.number().int().nonnegative(),
        text: z.string().max(2000),
      }),
    )
    .max(1000)
    .optional(),
});
export type LessonRevision = z.infer<typeof editSchema>;
export type Clip = z.infer<typeof clipSchema>;
export interface RecordingSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  mime: string;
  status: "recording" | "uploaded";
  parts: { index: number; path: string; size: number }[];
  duration?: number;
  previewPath?: string;
  interruptions: string[];
}
export interface TranscriptTurn {
  role: string;
  text: string;
  start: number;
  end: number;
}
export interface CallAsset {
  id: string;
  startedAt?: string;
  duration?: number;
  rawTranscript?: {
    role: string;
    message?: string;
    time_in_call_secs?: number;
  }[];
  turns: TranscriptTurn[];
  audioPath?: string;
  error?: string;
}
export interface RenderTask {
  id: string;
  lesson_id: string;
  kind: "prepare" | "render";
  revision: number;
  state: "queued" | "running" | "done" | "failed";
  lease_token?: string | null;
  lease_until?: string | null;
  error?: string | null;
  attempts: number;
}
export interface LessonDraft {
  id: string;
  ownerId: string;
  workerId: string;
  jobId: string;
  job: Job;
  revision: number;
  sources?: { url: string; label: string }[];
  status:
    | "waiting_for_media"
    | "generating"
    | "editing"
    | "rendering"
    | "ready_for_review"
    | "published"
    | "failed";
  recordingConsentAt: string;
  sessions: RecordingSession[];
  calls: CallAsset[];
  edit: LessonRevision;
  render?: {
    revision: number;
    video: string;
    poster: string;
    captions: string;
    duration: number;
  };
  review?: {
    revision: number;
    userId: string;
    name: string;
    credential: string;
    at: string;
  };
  publishConsent?: { revision: number; at: string; userId: string };
  publishedAt?: string;
  error?: string;
  syncConfirmedRevision?: number;
  createdAt: string;
}
export function timeline(edit: LessonRevision) {
  let t = 0;
  return edit.clips.map((c) => {
    const start = t;
    t += c.end - c.start + c.freezeSeconds;
    return { clip: c, start, end: t };
  });
}
export function validateEvidence(
  d: LessonDraft,
  edit: LessonRevision,
): string[] {
  const issues: string[] = [];
  for (const e of edit.captionEdits ?? []) {
    if (!d.calls.find((c) => c.id === e.callId)?.turns[e.turn])
      issues.push("Caption edit has no original transcript turn");
  }
  const ids = new Set<string>();
  for (const c of edit.clips) {
    if (ids.has(c.id)) issues.push("Duplicate clip id");
    ids.add(c.id);
    const session = d.sessions.find((s) => s.id === c.recordingId),
      call = d.calls.find((a) => a.id === c.callId),
      step = d.job.steps.find((s) => s.id === c.stepId);
    if (
      !session ||
      session.status !== "uploaded" ||
      c.end > (session.duration ?? 0)
    )
      issues.push(`Missing video or out-of-range clip ${c.id}`);
    if (!call?.audioPath || !call.turns.length)
      issues.push(`Missing original audio/transcript ${c.id}`);
    if (
      call?.turns.some(
        (t) =>
          !Number.isFinite(t.start) ||
          !Number.isFinite(t.end) ||
          t.start < 0 ||
          t.end <= t.start ||
          t.end > (call.duration ?? 0),
      )
    )
      issues.push(`Transcript timing needs review ${c.id}`);
    if (
      c.start + c.audioOffset < 0 ||
      c.end + c.audioOffset > (call?.duration ?? 0)
    )
      issues.push(`Audio interval out of range ${c.id}`);
    if (!step) issues.push(`Unknown step ${c.id}`);
    if (
      d.job.results.find((r) => r.stepId === c.stepId)?.status ===
        "worker_confirmed" &&
      c.kind !== "worker_confirmation"
    )
      issues.push(`Spoken result must be labeled worker confirmation ${c.id}`);
    if (step?.tag === "new_here" && (!step.ruleVerified || !step.sourceUrl))
      issues.push(`Unverified regional requirement ${c.id}`);
    if (
      c.kind === "mistake" &&
      !edit.clips.some(
        (x, i) =>
          i > edit.clips.indexOf(c) &&
          x.stepId === c.stepId &&
          x.kind === "correction",
      )
    )
      issues.push(`Mistake needs later correction ${c.id}`);
  }
  return [...new Set(issues)];
}
export function publishProblems(d: LessonDraft): string[] {
  return [
    ...validateEvidence(d, d.edit),
    ...(!editSchema.safeParse(d.edit).success
      ? ["Lesson edit is incomplete or invalid"]
      : []),
    ...d.edit.issues,
    ...(d.job.steps.some(
      (step) =>
        step.hardGate &&
        !d.job.results.some(
          (r) =>
            r.stepId === step.id &&
            r.status === "worker_confirmed" &&
            r.confirmedText?.trim(),
        ),
    )
      ? ["Hard-gate spoken confirmations are missing"]
      : []),
    ...(d.job.status !== "done" ? ["Job is not completed"] : []),
    ...(d.job.jobType !== "gfci-swap"
      ? ["This job type is outside the reviewed demo scope"]
      : []),
    ...(!d.job.siteConfirmed ||
    !d.job.site ||
    d.job.site.necEdition === "needs review"
      ? ["Jurisdiction is not confirmed"]
      : []),
    ...(!d.job.steps.length ||
    d.job.current < d.job.steps.length ||
    d.job.steps.some(
      (step) =>
        !d.job.results.some(
          (r) =>
            r.stepId === step.id &&
            ["seen", "worker_confirmed"].includes(r.status),
        ),
    )
      ? ["Incomplete step evidence"]
      : []),
    ...(d.syncConfirmedRevision !== d.revision
      ? ["Audio/video synchronization needs review"]
      : []),
    ...(!d.render || d.render.revision !== d.revision
      ? ["Current revision has no successful render"]
      : []),
    ...(!d.review || d.review.revision !== d.revision
      ? ["Electrician review required"]
      : []),
    ...(!d.publishConsent ||
    d.publishConsent.revision !== d.revision ||
    d.publishConsent.userId !== d.ownerId
      ? ["Worker publishing permission required"]
      : []),
  ];
}
export function applyEdit(d: LessonDraft, input: unknown): LessonDraft {
  const edit = editSchema.parse(input);
  const issues = validateEvidence(d, edit);
  if (issues.length) throw new Error(issues.join("; "));
  return {
    ...d,
    edit,
    revision: d.revision + 1,
    status: "editing",
    render: undefined,
    review: undefined,
    publishConsent: undefined,
    publishedAt: undefined,
    syncConfirmedRevision: undefined,
    error: undefined,
  };
}
export function publicLesson(d: LessonDraft) {
  if (d.status !== "published" || publishProblems(d).length) return null;
  return {
    id: d.id,
    title: d.edit.title,
    description: d.edit.description,
    region: d.job.site,
    review: d.review
      ? {
          name: d.review.name,
          credential: d.review.credential,
          at: d.review.at,
        }
      : undefined,
    label: "Observed by Boomer",
    demo: true,
    notice:
      "Inert demonstration; electrical test outcomes are simulated. Follow the actual device instructions and a qualified electrician’s reviewed procedure.",
    chapters: timeline(d.edit).map((t) => ({
      start: t.start,
      end: t.end,
      caption: t.clip.caption,
      kind: t.clip.kind,
      stepId: t.clip.stepId,
    })),
    sources: [
      ...(d.sources ?? []),
      ...d.job.steps
        .filter((s) => s.ruleVerified && s.sourceUrl)
        .map((s) => ({ url: s.sourceUrl, section: s.necSection })),
    ],
    render: d.render,
  };
}
