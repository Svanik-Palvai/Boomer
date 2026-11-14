// OWNER: Lessons feature. Actual Supabase SDK + lesson route against an isolated fake HTTP service.
// This does not claim to test live Supabase/RLS; no external request or real credential is used.
require("../../scripts/lessons/run.cjs");
const assert = require("node:assert/strict");
process.env.LESSON_SUPABASE_URL = "https://lesson-fixture.supabase.co";
process.env.LESSON_SUPABASE_SERVICE_ROLE_KEY = "fixture-server-key";
process.env.NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY = "fixture-public-key";
process.env.LESSON_REVIEWER_EMAILS = "reviewer@example.invalid";
const docs = [],
  tasks = [],
  bindings = [
    {
      worker_id: "worker-demo",
      user_id: "11111111-1111-4111-8111-111111111111",
    },
  ];
const users = {
  owner: { id: bindings[0].user_id, email: "worker@example.invalid" },
  other: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "other@example.invalid",
  },
  reviewer: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "reviewer@example.invalid",
  },
};
const response = (v, status = 200) =>
  new Response(JSON.stringify(v), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const clone = (v) => JSON.parse(JSON.stringify(v));
global.fetch = async (input, init = {}) => {
  const u = new URL(
    typeof input === "string" ? input : input.url || String(input),
  );
  assert.equal(u.host, "lesson-fixture.supabase.co");
  const headers = new Headers(init.headers),
    method = init.method || "GET";
  if (u.pathname === "/auth/v1/user") {
    const user = users[headers.get("authorization")?.replace("Bearer ", "")];
    return user
      ? response({
          ...user,
          email_confirmed_at: "2026-11-14T00:00:00Z",
          app_metadata: {},
          user_metadata: { reviewer: true },
        })
      : response({ message: "Invalid token" }, 401);
  }
  if (u.pathname.startsWith("/storage/v1/object/list/"))
    return response([{ name: "000000.part", metadata: { size: 14 } }]);
  const table = u.pathname.split("/").pop(),
    rows = {
      boomer_lessons: docs,
      boomer_lesson_tasks: tasks,
      boomer_lesson_workers: bindings,
    }[table];
  if (!rows) return response({ message: "Unexpected mock route" }, 500);
  const matches = (r) =>
    [...u.searchParams].every(([k, v]) => {
      if (["select", "order", "limit", "on_conflict"].includes(k)) return true;
      if (k === "or")
        return (
          r.state === "queued" ||
          (r.state === "running" && r.lease_until < new Date().toISOString())
        );
      let actual = k === "document->>status" ? r.document?.status : r[k];
      if (v.startsWith("eq.")) return String(actual) === v.slice(3);
      if (v.startsWith("is.")) return actual == null;
      if (v.startsWith("in."))
        return v.slice(4, -1).split(",").includes(String(actual));
      return true;
    });
  if (method === "GET") return response(clone(rows.filter(matches)));
  const body = init.body ? JSON.parse(init.body) : {};
  if (method === "POST") {
    for (const value of Array.isArray(body) ? body : [body]) {
      const key = table === "boomer_lesson_workers" ? "worker_id" : "id";
      if (rows.some((r) => r[key] === value[key])) {
        if (!headers.get("prefer")?.includes("ignore-duplicates"))
          return response({ message: "Duplicate" }, 409);
      } else
        rows.push({
          ...clone(value),
          version: value.version ?? 1,
          attempts: value.attempts ?? 0,
        });
    }
    return response([], 201);
  }
  if (method === "PATCH") {
    const matched = rows.filter(matches);
    for (const r of matched) Object.assign(r, clone(body));
    return response(clone(matched));
  }
  if (method === "DELETE") {
    const matched = rows.filter(matches);
    for (const r of matched) rows.splice(rows.indexOf(r), 1);
    return response(clone(matched));
  }
  return response({ message: "Unexpected method" }, 500);
};
const { GET, POST } = require("../../app/api/lessons/[...path]/route.ts");
const { getJob, updateJob } = require("../../lib/db/index.ts");
const store = require("../../lib/lessons/store.ts");
async function request(who, path, body) {
  const fn = body === undefined ? GET : POST;
  const req = new Request("http://localhost/api/lessons/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer " + who,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const r = await fn(req, { params: { path: path.split("/") } });
  return { status: r.status, data: await r.json() };
}
(async () => {
  assert.equal((await request("bad", "drafts")).status, 401);
  assert.equal(
    (await request("other", "jobs/demo-2041", { consent: true })).status,
    403,
  );
  let r = await request("owner", "jobs/demo-2041", { consent: true });
  assert.equal(r.status, 200);
  assert.equal(docs.length, 1);
  assert.equal(
    (await request("owner", "jobs/demo-2041", { consent: true })).status,
    200,
  );
  assert.equal(docs.length, 1);
  const id = r.data.id;
  assert.equal((await request("other", `drafts/${id}`)).status, 404);
  assert.equal((await request("other", "drafts")).data.length, 0);
  assert.equal((await request("reviewer", "drafts")).data.length, 1);
  assert.equal(
    (
      await request("other", "workers", {
        workerId: "x",
        userId: users.other.id,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("reviewer", `drafts/${id}/consent`, {
        revision: 1,
        consent: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("reviewer", `drafts/${id}/publish`, { revision: 1 })).status,
    400,
  );
  // Seed explicitly fake completed media evidence to exercise authorization and revision behavior.
  const doc = docs[0].document;
  doc.job.status = "done";
  doc.job.siteConfirmed = true;
  doc.job.current = doc.job.steps.length;
  doc.job.results = doc.job.results.map((r) => ({
    ...r,
    status: "worker_confirmed",
    confirmedText: "Explicit fixture confirmation",
    attempts: 1,
  }));
  doc.sessions = [
    {
      id: "s",
      status: "uploaded",
      duration: 20,
      parts: [{ index: 0, path: "private", size: 10 }],
      interruptions: [],
    },
  ];
  doc.calls = [
    {
      id: "c",
      duration: 20,
      audioPath: "private-audio",
      turns: [
        { role: "worker", text: "fixture transcript", start: 0, end: 10 },
      ],
    },
  ];
  const edit = {
    title: "Fixture only",
    description: "Not a real lesson",
    issues: [],
    clips: [
      {
        id: "clip",
        recordingId: "s",
        callId: "c",
        stepId: doc.job.steps[0].id,
        start: 0,
        end: 10,
        audioOffset: 0,
        annotations: [],
        freezeSeconds: 0,
        caption: "Fixture",
        kind: "worker_confirmation",
      },
    ],
  };
  r = await request("owner", `drafts/${id}/edit`, { revision: 1, edit });
  assert.equal(r.status, 200);
  assert.equal(r.data.revision, 2);
  assert.equal(
    (await request("owner", `drafts/${id}/edit`, { revision: 1, edit })).status,
    409,
  );
  docs[0].document.render = {
    revision: 2,
    video: "secret",
    poster: "secret",
    captions: "secret",
    duration: 10,
  };
  docs[0].document.status = "ready_for_review";
  assert.equal(
    (
      await request("owner", `drafts/${id}/review`, {
        revision: 2,
        name: "Name",
        credential: "Fixture credentials",
        reviewed: true,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("reviewer", `drafts/${id}/review`, {
        revision: 2,
        name: "Name",
        credential: "Fixture credentials",
        reviewed: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("owner", `drafts/${id}/sync`, { revision: 2 })).status,
    200,
  );
  assert.equal(
    (
      await request("owner", `drafts/${id}/consent`, {
        revision: 2,
        consent: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("reviewer", `drafts/${id}/publish`, { revision: 2 })).status,
    200,
  );
  r = await request("bad", `public/${id}`);
  assert.equal(r.status, 200);
  assert.ok(!r.data.calls && !r.data.sessions && !r.data.ownerId);
  assert.ok(!JSON.stringify(r.data).includes("fixture transcript"));
  assert.equal(
    (await request("owner", `drafts/${id}/withdraw`, { revision: 2 })).status,
    200,
  );
  assert.equal((await request("bad", `public/${id}`)).status, 404);
  await Promise.all([
    store.mutate(id, (d) => ({ ...d, error: "concurrent-a" })),
    store.mutate(id, (d) => ({ ...d, description: "concurrent-b" })),
  ]);
  assert.ok(docs[0].version >= 9);
  docs[0].document.sessions = [];
  docs[0].document.calls = [];
  docs[0].document.edit.clips = [];
  const { workOnce } = require("../../lib/lessons/worker.ts");
  await store.queue(id, "prepare", 0);
  await store.queue(id, "prepare", 0);
  assert.equal(tasks.length, 1);
  const worked = await Promise.all([workOnce(), workOnce()]);
  assert.equal(worked.filter(Boolean).length, 1);
  assert.equal(tasks[0].state, "queued");
  assert.equal(tasks[0].attempts, 1);
  tasks[0].state = "running";
  tasks[0].lease_token = "stale-token";
  tasks[0].lease_until = "2020-01-01T00:00:00Z";
  assert.equal(await workOnce(), true);
  assert.equal(tasks[0].state, "queued");
  assert.equal(tasks[0].attempts, 2);
  console.log(
    "PASS queue idempotency, concurrent worker claims, expired-lease recovery and missing-media waiting state",
  );
  const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    startedAt = "2026-11-14T12:00:00.000Z",
    endedAt = "2026-11-14T12:00:04.000Z";
  let before = docs[0].document.revision;
  assert.equal(
    (
      await request("owner", `drafts/${id}/session`, {
        sessionId,
        mime: "video/webm",
        startedAt,
      })
    ).status,
    200,
  );
  assert.equal(docs[0].document.revision, before + 1);
  const final = {
    sessionId,
    startedAt,
    endedAt,
    duration: 4,
    count: 1,
    interruptions: [],
  };
  assert.equal(
    (await request("owner", `drafts/${id}/finalize`, final)).status,
    200,
  );
  before = docs[0].document.revision;
  const taskCount = tasks.length;
  assert.equal(
    (await request("owner", `drafts/${id}/finalize`, final)).status,
    200,
  );
  assert.equal(docs[0].document.revision, before);
  assert.equal(tasks.length, taskCount);
  assert.equal(
    (
      await request("owner", `drafts/${id}/upload`, {
        sessionId,
        index: 0,
        size: 14,
      })
    ).data.alreadyUploaded,
    true,
  );
  assert.equal(
    (await request("owner", `drafts/${id}/finalize`, { ...final, duration: 5 }))
      .status,
    409,
  );
  console.log(
    "PASS finalized-upload retry, immutable source metadata, idempotent finalization and stable preparation enqueue",
  );
  console.log(
    "PASS authenticated API with real SDK/fake HTTP: owner isolation, reviewer allowlist, idempotent creation, stale edit rejection, consent/review gates, publication projection, withdrawal and optimistic write retries",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
