// OWNER: Lessons feature. Small integration hooks; disabled without dedicated lesson configuration.
import { templateReview } from "@/lib/location/steps";
import { USE_MOCKS } from "@/lib/config";
import type { Job } from "@/lib/types";
import {
  configured,
  database,
  LessonError,
  load,
  mutate,
  ownerFor,
  queue,
} from "./store";
import type { LessonDraft, TranscriptTurn } from "./types";
function sourcesFor(job: Job) {
  return [
    ...(templateReview(job.jobType ?? "")?.sourceUrl
      ? [
          {
            url: templateReview(job.jobType ?? "")!.sourceUrl,
            label: "Device instructions",
          },
        ]
      : []),
    ...(job.site
      ? [{ url: job.site.sourceUrl, label: "Jurisdiction edition source" }]
      : []),
  ];
}
export const lessonId = (jobId: string) => `lesson-${jobId}`;
export async function createForJob(job: Job, userId: string) {
  const ownerId = await ownerFor(job.workerId);
  if (ownerId !== userId)
    throw new Error("Only the linked worker can consent to recording");
  const now = new Date().toISOString();
  const d: LessonDraft = {
    id: lessonId(job.id),
    ownerId,
    workerId: job.workerId,
    jobId: job.id,
    job: structuredClone(job),
    sources: sourcesFor(job),
    revision: 1,
    status: "waiting_for_media",
    recordingConsentAt: now,
    fixture: USE_MOCKS,
    sessions: [],
    calls: [],
    edit: {
      title: job.title ?? "GFCI lesson",
      description:
        "Inert single-feed GFCI demonstration. Electrical testing is simulated.",
      clips: [],
      issues: [],
    },
    createdAt: now,
  };
  const { error } = await database()
    .from("boomer_lessons")
    .upsert(
      { id: d.id, owner_id: ownerId, document: d },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw error;
  const existing = (await load(d.id)).document;
  if (existing.job.createdAt !== job.createdAt)
    throw new LessonError(
      "This job ID was reused by a reset. Open a new uniquely identified job before recording.",
      409,
    );
  return existing;
}
export async function completed(job: Job) {
  if (!configured()) return;
  try {
    await mutate(lessonId(job.id), (d) => {
      if (d.job.createdAt !== job.createdAt)
        throw new LessonError(
          "Job identity changed during lesson capture",
          409,
        );
      return { ...d, job: structuredClone(job), sources: sourcesFor(job) };
    });
    await queue(lessonId(job.id), "prepare", 0);
  } catch (e) {
    if ((e as { status?: number }).status !== 404)
      console.error("[lessons] job snapshot could not be saved");
  }
}
export async function callEvidence(
  job: Job,
  payload: {
    conversation_id?: string;
    transcript?: {
      role: string;
      message?: string;
      time_in_call_secs?: number;
    }[];
    metadata?: { start_time_unix_secs?: number; call_duration_secs?: number };
  },
) {
  if (
    !configured() ||
    !process.env.ELEVENLABS_WEBHOOK_SECRET ||
    !payload.conversation_id
  )
    return;
  try {
    const id = payload.conversation_id,
      duration = payload.metadata?.call_duration_secs;
    const turns: TranscriptTurn[] = (payload.transcript ?? []).flatMap(
      (t, i, a) =>
        typeof t.time_in_call_secs === "number" && t.message
          ? [
              {
                role: t.role,
                text: t.message,
                start: t.time_in_call_secs,
                end:
                  a[i + 1]?.time_in_call_secs ??
                  duration ??
                  t.time_in_call_secs,
              },
            ]
          : [],
    );
    await mutate(lessonId(job.id), (d) => {
      if (d.job.createdAt !== job.createdAt)
        throw new LessonError("Job identity changed during call capture", 409);
      return d.calls.some((c) => c.id === id)
        ? d
        : {
            ...d,
            calls: [
              ...d.calls,
              {
                id,
                startedAt: payload.metadata?.start_time_unix_secs
                  ? new Date(
                      payload.metadata.start_time_unix_secs * 1000,
                    ).toISOString()
                  : undefined,
                duration,
                rawTranscript: payload.transcript,
                turns,
              },
            ],
          };
    });
    // A new event wakes the preparation task after missing media. Revision 0 denotes preparation.
    const { error } = await database()
      .from("boomer_lesson_tasks")
      .upsert(
        {
          id: `${lessonId(job.id)}:prepare:call-${id}`,
          lesson_id: lessonId(job.id),
          kind: "prepare",
          revision: 0,
          state: "queued",
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw error;
  } catch (e) {
    if ((e as { status?: number }).status !== 404)
      throw new Error(
        "Lesson call evidence storage unavailable; retry webhook",
      );
  }
}
