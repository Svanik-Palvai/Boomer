// OWNER: Lessons feature. Explicit opt-in live integration in the dedicated Boomer project.
// Creates only labeled private fixtures, never publishes, then removes only its own rows/users/files.
require("../../scripts/lessons/run.cjs");
const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  pathModule = require("node:path");
if (process.env.LESSON_LIVE_TESTS !== "true")
  throw new Error("Set LESSON_LIVE_TESTS=true to run labeled live fixtures");
const ref = new URL(process.env.LESSON_SUPABASE_URL).hostname.split(".")[0];
if (ref !== process.env.LESSON_TEST_PROJECT_REF)
  throw new Error("Explicit matching LESSON_TEST_PROJECT_REF required");
const {
  database,
  bucket,
  load,
  mutate,
  ownerFor,
} = require("../../lib/lessons/store.ts");
const { createClient } = require("@supabase/supabase-js");
const { GET } = require("../../app/api/lessons/[...path]/route.ts");
const { publishProblems } = require("../../lib/lessons/types.ts");
const db = database(),
  tag = "fixture-" + crypto.randomUUID(),
  users = [],
  objects = [];
const publicClient = createClient(
  process.env.LESSON_SUPABASE_URL,
  process.env.NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const jobId = tag,
  workerId = tag,
  lessonId = "lesson-" + tag;
(async () => {
  try {
    const password = crypto.randomBytes(24).toString("base64url");
    const made = await db.auth.admin.createUser({
      email: `boomer-${tag}@example.invalid`,
      password,
      email_confirm: true,
    });
    if (made.error) throw made.error;
    users.push(made.data.user.id);
    const uid = made.data.user.id;
    let result = await db
      .from("boomer_lesson_workers")
      .insert({ worker_id: workerId, user_id: uid });
    if (result.error) throw result.error;
    assert.equal(await ownerFor(workerId), uid);
    const { demoJob } = require("../../lib/mock/demo.ts");
    const job = demoJob();
    job.id = jobId;
    job.workerId = workerId;
    const now = new Date().toISOString(),
      doc = {
        id: lessonId,
        ownerId: uid,
        workerId,
        jobId,
        job,
        revision: 1,
        status: "waiting_for_media",
        recordingConsentAt: now,
        fixture: true,
        sessions: [],
        calls: [],
        edit: {
          title: "FIXTURE ONLY — live privacy test",
          description: "Not a real job. Never publish.",
          clips: [],
          issues: ["Fixture cannot be published"],
        },
        createdAt: now,
      };
    result = await db
      .from("boomer_lessons")
      .insert({ id: lessonId, owner_id: uid, document: doc });
    if (result.error) throw result.error;
    assert.equal((await load(lessonId)).document.fixture, true);
    const session = await publicClient.auth.signInWithPassword({
      email: `boomer-${tag}@example.invalid`,
      password,
    });
    if (session.error) throw session.error;
    const token = session.data.session.access_token;
    const privateResponse = await GET(
      new Request(`http://localhost/api/lessons/drafts/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      { params: { path: ["drafts", lessonId] } },
    );
    assert.equal(privateResponse.status, 200);
    await publicClient.auth.signOut({ scope: "local" });

    await mutate(lessonId, (d) => ({ ...d, error: "Fixture write verified" }));
    assert.equal(
      (await load(lessonId)).document.error,
      "Fixture write verified",
    );
    for (const table of [
      "boomer_lessons",
      "boomer_lesson_workers",
      "boomer_lesson_tasks",
    ]) {
      const r = await publicClient.from(table).select("*").limit(1);
      assert.ok(r.error, `Anonymous access must be denied on ${table}`);
    }
    const settings = await db.storage.getBucket(bucket);
    if (settings.error) throw settings.error;
    assert.equal(settings.data.public, false);
    const path = `${lessonId}/FIXTURE-PRIVATE.bin`;
    objects.push(path);
    const signed = await db.storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error) throw signed.error;
    const uploaded = await publicClient.storage
      .from(bucket)
      .uploadToSignedUrl(
        path,
        signed.data.token,
        Buffer.from("FIXTURE ONLY — not real job media"),
        { contentType: "application/octet-stream" },
      );
    if (uploaded.error) throw uploaded.error;
    const denied = await publicClient.storage.from(bucket).download(path);
    assert.ok(denied.error, "Anonymous private download must fail");
    const read = await db.storage.from(bucket).createSignedUrl(path, 30);
    if (read.error) throw read.error;
    const response = await fetch(read.data.signedUrl);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes("FIXTURE ONLY"));
    assert.ok(
      publishProblems((await load(lessonId)).document).some((p) =>
        p.includes("Fixture"),
      ),
    );
    const publicResponse = await GET(
      new Request(`http://localhost/api/lessons/public/${lessonId}`),
      { params: { path: ["public", lessonId] } },
    );
    assert.equal(publicResponse.status, 404);
    if (process.env.FFMPEG_PATH) {
      const { ffmpeg, workOnce } = require("../../lib/lessons/worker.ts");
      const { queue } = require("../../lib/lessons/store.ts");
      const dir = await fs.mkdtemp(
        pathModule.join(os.tmpdir(), "boomer-live-render-fixture-"),
      );
      try {
        const video = pathModule.join(dir, "fixture.mp4"),
          audio = pathModule.join(dir, "fixture.mp3");
        await ffmpeg([
          "-f",
          "lavfi",
          "-i",
          "color=c=blue:s=360x640:r=30:d=6",
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          "-y",
          video,
        ]);
        await ffmpeg([
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=440:duration=6",
          "-c:a",
          "libmp3lame",
          "-y",
          audio,
        ]);
        const videoPath = `${lessonId}/FIXTURE-video.part`,
          audioPath = `${lessonId}/FIXTURE-audio.mp3`;
        const recording = pathModule.join(dir, "original-with-audio.mp4");
        await ffmpeg(["-i", video, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-shortest", "-y", recording]);
        for (const [file, filePath, type] of [
          [recording, videoPath, "application/octet-stream"],
          [audio, audioPath, "audio/mpeg"],
        ]) {
          objects.push(filePath);
          const r = await db.storage
            .from(bucket)
            .upload(filePath, await fs.readFile(file), { contentType: type });
          if (r.error) throw r.error;
        }
        const videoSize = (await fs.stat(recording)).size;
        await mutate(lessonId, (d) => ({
          ...d,
          job: {
            ...d.job,
            status: "done",
            siteConfirmed: true,
            current: d.job.steps.length,
            results: d.job.results.map((r) => ({
              ...r,
              status: "worker_confirmed",
              confirmedText: "FIXTURE confirmation only",
              attempts: 1,
            })),
          },
          status: "rendering",
          sessions: [
            {
              id: "fixture-video",
              status: "uploaded",
              startedAt: now,
              mime: "video/mp4",
              duration: 6,
              parts: [{ index: 0, path: videoPath, size: videoSize }],
              interruptions: [],
            },
          ],
          calls: [
            {
              id: "fixture-audio",
              audioPath: audioPath,
              duration: 6,
              turns: [
                {
                  role: "worker",
                  text: "FIXTURE audio tone, not a real worker.",
                  start: 1,
                  end: 4,
                },
              ],
            },
          ],
          edit: {
            title: "FIXTURE ONLY — do not publish",
            description: "Synthetic private rendering integration",
            issues: ["Fixture cannot be published"],
            clips: [
              {
                id: "fixture-clip",
                recordingId: "fixture-video",
                callId: "fixture-audio",
                stepId: d.job.steps[0].id,
                start: 1,
                end: 4,
                caption: "FIXTURE ONLY",
                kind: "worker_confirmation",
                audioOffset: 0,
                annotations: [],
                freezeSeconds: 0,
              },
            ],
          },
        }));
        await queue(lessonId, "render", 1);
        // Storage's server timestamp can be slightly ahead of the laptop clock.
        // Match the real polling worker instead of assuming immediate eligibility.
        let claimed = false;
        for (let attempt = 0; attempt < 10 && !claimed; attempt++) {
          claimed = await workOnce(lessonId);
          if (!claimed) await new Promise(resolve => setTimeout(resolve, 1000));
        }
        assert.equal(claimed, true, "Private render task did not become eligible within ten polls");
        const rendered = (await load(lessonId)).document;
        assert.ok(rendered.render, rendered.error);
        assert.equal(rendered.status, "ready_for_review");
        assert.ok(publishProblems(rendered).some((p) => p.includes("Fixture")));
        objects.push(
          rendered.render.video,
          rendered.render.poster,
          rendered.render.captions,
        );
        const tasks = await db
          .from("boomer_lesson_tasks")
          .select("state,attempts")
          .eq("lesson_id", lessonId);
        assert.equal(tasks.data[0].state, "done");
        assert.equal(tasks.data[0].attempts, 1);
        // Exercise the new preparation path with actual private storage, and
        // explicitly no voice-provider credential.
        await mutate(lessonId, d => ({ ...d, status: "waiting_for_media",
          edit: { ...d.edit, clips: [] },
          calls: [{ id: "import-fixture", sourceRecordingId: "fixture-video", startedAt: now,
            duration: 6, turns: [{ role: "worker", text: "FIXTURE recording tone only", start: 1, end: 4 }] }],
        }));
        await queue(lessonId, "prepare", 0);
        const providerKey = process.env.ELEVENLABS_API_KEY;
        process.env.ELEVENLABS_API_KEY = "";
        try {
          let prepared = false;
          for (let attempt = 0; attempt < 10 && !prepared; attempt++) {
            prepared = await workOnce(lessonId);
            if (!prepared) await new Promise(resolve => setTimeout(resolve, 1000));
          }
          assert.ok(prepared, "Imported source preparation was not claimed");
          const imported = (await load(lessonId)).document;
          assert.equal(imported.status, "editing", imported.error);
          assert.ok(imported.calls[0].audioPath, "Original audio was not extracted");
          assert.ok(imported.sessions[0].previewPath, "Source preview was not created");
          objects.push(imported.calls[0].audioPath, imported.sessions[0].previewPath);
        } finally {
          if (providerKey === undefined) delete process.env.ELEVENLABS_API_KEY;
          else process.env.ELEVENLABS_API_KEY = providerKey;
        }
        console.log("PASS live provider-free preparation: original uploaded soundtrack, private preview/audio assets, editable draft without ElevenLabs");
        console.log(
          "PASS live private pipeline: real SDK authentication, scoped worker claim, actual source assembly/FFmpeg rendering, private artifact uploads and completed task persistence",
        );
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
    console.log(
      "PASS live Boomer integration: private fixture storage, verified RLS/table grants, scoped direct upload, denied anonymous reads, authorized signed media, durable optimistic writes and fixture publication blocking",
    );
  } finally {
    if (objects.length) {
      const r = await db.storage.from(bucket).remove(objects);
      if (r.error) console.error("Fixture file cleanup needs attention:", tag);
    }
    for (const table of [
      "boomer_lesson_tasks",
      "boomer_lessons",
      "boomer_lesson_workers",
    ]) {
      const r = await db
        .from(table)
        .delete()
        .eq(
          table === "boomer_lesson_tasks"
            ? "lesson_id"
            : table === "boomer_lessons"
              ? "id"
              : "worker_id",
          table === "boomer_lesson_workers" ? workerId : lessonId,
        );
      if (r.error)
        console.error("Fixture row cleanup needs attention:", table, tag);
    }
    for (const user of users) {
      const r = await db.auth.admin.deleteUser(user);
      if (r.error) console.error("Fixture auth cleanup needs attention:", tag);
    }
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
