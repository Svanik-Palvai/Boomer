// OWNER: Lessons feature. Server only. Never import in client components.
import { createClient } from "@supabase/supabase-js";
import type { LessonDraft, RenderTask } from "./types";
export class LessonError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function configured() {
  return !!(
    process.env.LESSON_SUPABASE_URL &&
    process.env.LESSON_SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY
  );
}
export function database() {
  if (!configured())
    throw new LessonError(
      "Lessons require the dedicated Boomer Supabase configuration",
      503,
    );
  return createClient(
    process.env.LESSON_SUPABASE_URL!,
    process.env.LESSON_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(
              String(input instanceof Request ? input.url : input).includes(
                "/storage/v1/",
              )
                ? 120000
                : 5000,
            ),
          }),
      },
    },
  );
}
export const bucket = "boomer-lesson-media";
export async function auth(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new LessonError("Sign in to access private lessons", 401);
  const { data, error } = await database().auth.getUser(token);
  if (error || !data.user || !data.user.email_confirmed_at)
    throw new LessonError("Valid verified account required", 401);
  const reviewers = (process.env.LESSON_REVIEWER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return {
    id: data.user.id,
    reviewer: reviewers.includes(data.user.email?.toLowerCase() ?? ""),
  };
}
export type Principal = Awaited<ReturnType<typeof auth>>;
export async function ownerFor(workerId: string) {
  const { data, error } = await database()
    .from("boomer_lesson_workers")
    .select("user_id")
    .eq("worker_id", workerId)
    .maybeSingle();
  if (error) throw new LessonError("Worker ownership lookup failed", 503);
  if (!data)
    throw new LessonError(
      "Reviewer must link worker to an authenticated account first",
      409,
    );
  return data.user_id as string;
}
export async function load(id: string) {
  const { data, error } = await database()
    .from("boomer_lessons")
    .select("document,version")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new LessonError("Lesson storage unavailable", 503);
  if (!data) throw new LessonError("Lesson not found", 404);
  return {
    document: data.document as LessonDraft,
    version: data.version as number,
  };
}
export function access(d: LessonDraft, p: Principal) {
  if (!p.reviewer && d.ownerId !== p.id)
    throw new LessonError("Lesson not found", 404);
}
export async function mutate(
  id: string,
  fn: (d: LessonDraft) => LessonDraft,
  revision?: number,
) {
  for (let n = 0; n < 5; n++) {
    const { document, version } = await load(id);
    if (revision !== undefined && document.revision !== revision)
      throw new LessonError("Lesson changed; reload before editing", 409);
    const next = fn(structuredClone(document));
    const { data, error } = await database()
      .from("boomer_lessons")
      .update({ document: next, version: version + 1 })
      .eq("id", id)
      .eq("version", version)
      .select("id");
    if (error) throw new LessonError("Could not save lesson", 503);
    if (data?.length) return next;
  }
  throw new LessonError("Lesson is busy; retry", 409);
}
export async function queue(
  lessonId: string,
  kind: RenderTask["kind"],
  revision: number,
  suffix = String(revision),
) {
  const { error } = await database()
    .from("boomer_lesson_tasks")
    .upsert(
      {
        id: `${lessonId}:${kind}:${suffix}`,
        lesson_id: lessonId,
        kind,
        revision,
        state: "queued",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw new LessonError("Could not queue task", 503);
}
export async function sign(path: string) {
  const { data, error } = await database()
    .storage.from(bucket)
    .createSignedUrl(path, 120);
  if (error || !data) throw new LessonError("Media unavailable", 503);
  return data.signedUrl;
}
export async function upload(path: string) {
  const { data, error } = await database()
    .storage.from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw new LessonError("Could not create upload URL", 503);
  return data;
}
