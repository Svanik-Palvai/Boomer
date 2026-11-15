// OWNER: Lessons feature. Authenticated private API + explicit published projections.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getJob } from "@/lib/db";
import { lessonId, createForJob } from "@/lib/lessons/hooks";
import {
  access,
  auth,
  bucket,
  configured,
  database,
  LessonError,
  load,
  mutate,
  ownerFor,
  queue,
  sign,
  upload,
} from "@/lib/lessons/store";
import {
  applyEdit,
  editSchema,
  publicLesson,
  publishProblems,
  validateEvidence,
} from "@/lib/lessons/types";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const body = async (req: Request) => {
  if (Number(req.headers.get("content-length") ?? 0) > 2000000)
    throw new LessonError("Request too large", 413);
  try {
    return await req.json();
  } catch {
    throw new LessonError("Invalid JSON");
  }
};
const short = z.string().min(1).max(200);
async function handler(req: Request, path: string[]) {
  const [area, id, action] = path;
  if (req.method === "GET" && area === "config")
    return json({
      configured: configured(),
      url: configured() ? process.env.LESSON_SUPABASE_URL : undefined,
      anonKey: configured()
        ? process.env.NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY
        : undefined,
    });
  if (req.method === "GET" && area === "public") {
    if (!configured())
      return json(id ? { error: "Lesson not found" } : [], id ? 404 : 200);
    if (!id) {
      const { data, error } = await database()
        .from("boomer_lessons")
        .select("document")
        .eq("document->>status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new LessonError("Library unavailable", 503);
      return json(
        (data ?? [])
          .map((r) => publicLesson(r.document))
          .filter(Boolean)
          .map((d) => ({ ...d, render: { duration: d!.render!.duration } })),
      );
    }
    const { document: d } = await load(id);
    const published = publicLesson(d);
    if (!published) throw new LessonError("Lesson not found", 404);
    if (action) {
      const field = { video: "video", poster: "poster", captions: "captions" }[
        action
      ] as "video" | "poster" | "captions" | undefined;
      if (!field) throw new LessonError("Media not found", 404);
      const source = await sign(d.render![field]);
      const response = await fetch(source, {
        headers: req.headers.has("range")
          ? { Range: req.headers.get("range")! }
          : {},
        cache: "no-store",
      });
      const headers = new Headers({
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      for (const h of [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
      ]) {
        const v = response.headers.get(h);
        if (v) headers.set(h, v);
      }
      return new Response(response.body, { status: response.status, headers });
    }
    return json({ ...published, render: { duration: d.render!.duration } });
  }
  const p = await auth(req);
  if (area === "workers" && req.method === "POST") {
    if (!p.reviewer) throw new LessonError("Reviewer access required", 403);
    const b = z
      .object({ workerId: short, userId: z.string().uuid() })
      .parse(await body(req));
    // A binding cannot be silently reassigned to another user.
    const { error } = await database()
      .from("boomer_lesson_workers")
      .insert({ worker_id: b.workerId, user_id: b.userId });
    if (error)
      throw new LessonError("Worker already linked or account is invalid", 409);
    return json({ ok: true });
  }
  if (area === "jobs" && id && req.method === "POST") {
    const b = z.object({ consent: z.literal(true) }).parse(await body(req));
    void b;
    const job = await getJob(id);
    if (!job) throw new LessonError("Job not found", 404);
    if (job.jobType && job.jobType !== "gfci-swap")
      throw new LessonError(
        "Only the reviewed GFCI demo template is supported",
      );
    if ((await ownerFor(job.workerId)) !== p.id)
      throw new LessonError("Only the linked worker can start recording", 403);
    return json(await createForJob(job, p.id));
  }
  if (area !== "drafts") throw new LessonError("Not found", 404);
  if (!id && req.method === "GET") {
    let query = database()
      .from("boomer_lessons")
      .select("id,document")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!p.reviewer) query = query.eq("owner_id", p.id);
    const { data, error } = await query;
    if (error) throw new LessonError("Drafts unavailable", 503);
    return json(data);
  }
  if (!id) throw new LessonError("Draft id required");
  const { document: d } = await load(id);
  access(d, p);
  if (req.method === "GET") {
    if (action === "media") {
      const kind = new URL(req.url).searchParams.get("kind");
      const params = new URL(req.url).searchParams;
      const session = d.sessions.find((s) => s.id === params.get("session"));
      const call = d.calls.find((c) => c.id === params.get("call"));
      const paths: Record<string, string | undefined> = {
        ...(d.render
          ? {
              video: d.render.video,
              poster: d.render.poster,
              captions: d.render.captions,
            }
          : {}),
        source: session?.previewPath,
        audio: call?.audioPath,
      };
      const file = paths[kind as keyof typeof paths];
      if (!file) throw new LessonError("Render not available", 404);
      return json({ url: await sign(file) });
    }
    return json({ ...d, viewer: p });
  }
  const b = await body(req);
  if (action === "session") {
    if (p.id !== d.ownerId)
      throw new LessonError("Only the worker may record", 403);
    const input = z
      .object({
        sessionId: z.string().uuid(),
        mime: z.enum(["video/webm", "video/mp4"]),
        startedAt: z.string().datetime(),
      })
      .parse(b);
    const updated = await mutate(id, (x) => {
      if (x.status === "published")
        throw new LessonError("Withdraw published lesson before recording");
      if (x.sessions.some((s) => s.id === input.sessionId)) return x;
      if (x.sessions.length >= 10)
        throw new LessonError("Too many recording sessions");
      return {
        ...x,
        revision: x.revision + 1,
        status: "waiting_for_media",
        render: undefined,
        review: undefined,
        publishConsent: undefined,
        publishedAt: undefined,
        syncConfirmedRevision: undefined,
        sessions: [
          ...x.sessions,
          {
            id: input.sessionId,
            startedAt: input.startedAt,
            mime: input.mime,
            status: "recording",
            parts: [],
            interruptions: [],
          },
        ],
      };
    });
    return json(updated);
  }
  if (action === "import-audio") {
    if (p.id !== d.ownerId)
      throw new LessonError("Only the worker may import source evidence", 403);
    const input = z.object({
      sessionId: z.string().uuid(),
      consent: z.literal(true),
      turns: z.array(z.object({
        role: z.string().trim().min(1).max(80),
        text: z.string().trim().min(1).max(4000),
        start: z.number().finite().nonnegative(),
        end: z.number().finite().positive(),
      })).min(1).max(2000),
    }).parse(b);
    const updated = await mutate(id, (x) => {
      const session = x.sessions.find(s => s.id === input.sessionId);
      if (!session || session.status !== "uploaded" || !session.duration)
        throw new LessonError("Finalize the source recording first", 409);
      if (input.turns.some((t, i) => t.end <= t.start || t.end > session.duration! || (i > 0 && t.start < input.turns[i - 1].start)))
        throw new LessonError("Transcript must be ordered and within the recording duration");
      const callId = `import-${session.id}`;
      const existing = x.calls.find(c => c.id === callId);
      if (existing) {
        if (JSON.stringify(existing.turns) !== JSON.stringify(input.turns))
          throw new LessonError("Imported transcripts are immutable; use caption edits for corrections", 409);
        return x;
      }
      if (x.status === "published" || x.edit.clips.length)
        throw new LessonError("Import sources before editing the lesson", 409);
      return { ...x, revision: x.revision + 1, status: "waiting_for_media",
        render: undefined, review: undefined, publishConsent: undefined,
        publishedAt: undefined, syncConfirmedRevision: undefined,
        calls: [...x.calls, { id: callId, sourceRecordingId: session.id,
          startedAt: session.startedAt, duration: session.duration, turns: input.turns }],
      };
    });
    await queue(id, "prepare", 0, `import-${input.sessionId}`);
    return json(updated);
  }
  if (action === "upload") {
    if (p.id !== d.ownerId)
      throw new LessonError("Only the worker may upload", 403);
    const input = z
      .object({
        sessionId: z.string().uuid(),
        index: z.number().int().min(0).max(1000),
        size: z
          .number()
          .int()
          .positive()
          .max(25 * 1024 * 1024),
      })
      .parse(b);
    const s = d.sessions.find((s) => s.id === input.sessionId);
    if (!s) throw new LessonError("Recording session is not open");
    const directory = `${id}/sources/${s.id}`,
      name = `${String(input.index).padStart(6, "0")}.part`;
    const { data: files, error } = await database()
      .storage.from(bucket)
      .list(directory, { search: name, limit: 10 });
    if (error) throw new LessonError("Upload lookup failed", 503);
    const existing = files?.find((f) => f.name === name);
    if (existing) {
      if (Number(existing.metadata?.size) !== input.size)
        throw new LessonError("Existing part size mismatch", 409);
      return json({ alreadyUploaded: true });
    }
    if (s.status !== "recording")
      throw new LessonError(
        "Finalized recording is missing a part; inspect source storage",
        409,
      );
    return json(await upload(`${directory}/${name}`));
  }
  if (action === "finalize") {
    if (p.id !== d.ownerId)
      throw new LessonError("Only the worker may finalize", 403);
    const input = z
      .object({
        sessionId: z.string().uuid(),
        startedAt: z.string().datetime(),
        endedAt: z.string().datetime(),
        duration: z.number().positive().max(900),
        count: z.number().int().min(1).max(1000),
        interruptions: z.array(z.string().max(300)).max(30),
      })
      .parse(b);
    const s = d.sessions.find((s) => s.id === input.sessionId);
    if (!s) throw new LessonError("Session not found");
    if (s.status === "uploaded") {
      if (
        s.parts.length !== input.count ||
        s.duration !== input.duration ||
        s.startedAt !== input.startedAt ||
        s.endedAt !== input.endedAt
      )
        throw new LessonError(
          "Finalized recordings are immutable; create a new session",
          409,
        );
      await queue(id, "prepare", 0, `session-${s.id}`);
      return json(d);
    }
    const dir = `${id}/sources/${s.id}`;
    const { data: files, error } = await database()
      .storage.from(bucket)
      .list(dir, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw new LessonError("Upload verification unavailable", 503);
    const parts = Array.from({ length: input.count }, (_, index) => {
      const name = `${String(index).padStart(6, "0")}.part`;
      const f = files?.find((f) => f.name === name);
      const size = Number(f?.metadata?.size);
      if (!f || !Number.isFinite(size) || size <= 0 || size > 25 * 1024 * 1024)
        throw new LessonError(
          `Recording part ${index} missing; retry upload`,
          409,
        );
      return { index, path: `${dir}/${name}`, size };
    });
    if (Date.parse(input.endedAt) <= Date.parse(input.startedAt))
      throw new LessonError("Invalid recording clock");
    const updated = await mutate(id, (x) => {
      const latest = x.sessions.find((y) => y.id === s.id);
      if (!latest)
        throw new LessonError("Recording session no longer exists", 409);
      if (latest.status === "uploaded") {
        if (
          latest.parts.length !== input.count ||
          latest.duration !== input.duration ||
          latest.startedAt !== input.startedAt ||
          latest.endedAt !== input.endedAt
        )
          throw new LessonError(
            "Conflicting finalization; reload the recording",
            409,
          );
        return x;
      }
      return {
        ...x,
        status: "waiting_for_media",
        revision: x.revision + 1,
        syncConfirmedRevision: undefined,
        render: undefined,
        review: undefined,
        publishConsent: undefined,
        publishedAt: undefined,
        sessions: x.sessions.map((y) =>
          y.id === s.id
            ? {
                ...y,
                status: "uploaded",
                parts,
                startedAt: input.startedAt,
                endedAt: input.endedAt,
                duration: input.duration,
                interruptions: input.interruptions,
              }
            : y,
        ),
      };
    });
    await queue(id, "prepare", 0, `session-${s.id}`);
    return json(updated);
  }
  const input = z
    .object({ revision: z.number().int().positive() })
    .passthrough()
    .parse(b);
  if (action === "edit") {
    const next = await mutate(
      id,
      (x) => {
        try {
          return applyEdit(x, editSchema.parse(b.edit));
        } catch (e) {
          if (e instanceof z.ZodError) throw e;
          throw new LessonError(
            e instanceof Error ? e.message : "Invalid lesson evidence",
          );
        }
      },
      input.revision,
    );
    return json(next);
  }
  if (action === "sync") {
    return json(
      await mutate(
        id,
        (x) => ({ ...x, syncConfirmedRevision: x.revision }),
        input.revision,
      ),
    );
  }
  if (action === "prepare") {
    await queue(id, "prepare", Date.now());
    return json({ ok: true });
  }
  if (action === "render") {
    editSchema.parse(d.edit);
    const issues = validateEvidence(d, d.edit);
    if (issues.length || !d.edit.clips.length)
      throw new LessonError(issues.join("; ") || "No clips");
    await mutate(
      id,
      (x) => ({
        ...x,
        status: "rendering",
        review: undefined,
        publishConsent: undefined,
        publishedAt: undefined,
        error: undefined,
      }),
      input.revision,
    );
    // A failed task can be explicitly requeued; a running lease is never stolen here.
    const taskId = `${id}:render:${input.revision}`;
    await database()
      .from("boomer_lesson_tasks")
      .delete()
      .eq("id", taskId)
      .in("state", ["failed", "done"]);
    await queue(id, "render", input.revision);
    return json({ ok: true });
  }
  if (action === "review") {
    if (!p.reviewer) throw new LessonError("Reviewer access required", 403);
    const info = z
      .object({
        name: z.string().trim().min(2).max(120),
        credential: z.string().trim().min(5).max(300),
        reviewed: z.literal(true),
      })
      .parse(b);
    return json(
      await mutate(
        id,
        (x) => {
          if (
            !x.render ||
            x.render.revision !== x.revision ||
            x.edit.issues.length ||
            validateEvidence(x, x.edit).length
          )
            throw new LessonError("Review requires a complete current render");
          return {
            ...x,
            review: {
              ...info,
              revision: x.revision,
              userId: p.id,
              at: new Date().toISOString(),
            },
          };
        },
        input.revision,
      ),
    );
  }
  if (action === "consent") {
    if (p.id !== d.ownerId || b.consent !== true)
      throw new LessonError("Explicit worker publishing consent required", 403);
    return json(
      await mutate(
        id,
        (x) => ({
          ...x,
          publishConsent: {
            revision: x.revision,
            userId: p.id,
            at: new Date().toISOString(),
          },
        }),
        input.revision,
      ),
    );
  }
  if (action === "publish") {
    if (!p.reviewer) throw new LessonError("Reviewer access required", 403);
    return json(
      await mutate(
        id,
        (x) => {
          const issues = publishProblems(x);
          if (issues.length) throw new LessonError(issues.join("; "));
          return {
            ...x,
            status: "published",
            publishedAt: new Date().toISOString(),
          };
        },
        input.revision,
      ),
    );
  }
  if (action === "withdraw") {
    return json(
      await mutate(
        id,
        (x) => ({
          ...x,
          status: "editing",
          publishedAt: undefined,
          review: undefined,
          publishConsent: undefined,
        }),
        input.revision,
      ),
    );
  }
  throw new LessonError("Not found", 404);
}
async function dispatch(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  try {
    return await handler(req, params.path);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json(
        { error: "Invalid lesson request", details: e.flatten() },
        400,
      );
    return json(
      {
        error:
          e instanceof LessonError
            ? e.message
            : "Lesson operation failed; check configuration or retry",
      },
      e instanceof LessonError ? e.status : 500,
    );
  }
}
export const GET = dispatch;
export const POST = dispatch;
