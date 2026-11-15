// OWNER: Lessons feature. Pure policy/API regression suite; no live credentials used.
require("../../scripts/lessons/run.cjs");
const assert = require("node:assert/strict");
const { demoJob } = require("../../lib/mock/demo.ts");
const {
  applyEdit,
  editSchema,
  publicLesson,
  publishProblems,
  timeline,
  validateEvidence,
} = require("../../lib/lessons/types.ts");
const { vtt, evidenceProposal } = require("../../lib/lessons/proposal.ts");
const { access } = require("../../lib/lessons/store.ts");
const { GET, POST } = require("../../app/api/lessons/[...path]/route.ts");
function fixture() {
  const job = demoJob();
  job.status = "done";
  job.siteConfirmed = true;
  job.current = job.steps.length;
  job.results = job.results.map((r, i) => ({
    ...r,
    status: job.steps[i].hardGate ? "worker_confirmed" : "seen",
    confirmedText: job.steps[i].hardGate
      ? "Explicit fixture confirmation"
      : undefined,
    attempts: 1,
  }));
  const start = "2026-11-14T12:00:00.000Z";
  return {
    id: "lesson-test",
    ownerId: "owner",
    workerId: job.workerId,
    jobId: job.id,
    job,
    revision: 1,
    status: "editing",
    recordingConsentAt: start,
    createdAt: start,
    sources: [],
    sessions: [
      {
        id: "video",
        startedAt: start,
        endedAt: "2026-11-14T12:00:20.000Z",
        mime: "video/mp4",
        status: "uploaded",
        parts: [],
        duration: 20,
        interruptions: [],
      },
    ],
    calls: [
      {
        id: "call",
        audioPath: "private-call.mp3",
        duration: 20,
        startedAt: start,
        turns: [
          {
            role: "worker",
            text: "<script>test</script> I see LINE.",
            start: 1,
            end: 5,
          },
        ],
      },
    ],
    edit: {
      title: "FIXTURE — inert demonstration",
      description: "Synthetic media fixture, not a real job.",
      clips: [
        {
          id: "clip1",
          recordingId: "video",
          callId: "call",
          stepId: job.steps[0].id,
          start: 1,
          end: 4,
          caption: "Fixture",
          kind: "worker_confirmation",
          annotations: [],
          freezeSeconds: 0,
          audioOffset: 0,
        },
      ],
      issues: [],
    },
  };
}
(async () => {
  let d = fixture();
  assert.equal(validateEvidence(d, d.edit).length, 0);
  assert.ok(publishProblems(d).length >= 3);
  assert.equal(publicLesson(d), null);
  assert.throws(
    () => access(d, { id: "stranger", reviewer: false }),
    /not found/,
  );
  assert.doesNotThrow(() => access(d, { id: "owner", reviewer: false }));
  assert.doesNotThrow(() => access(d, { id: "reviewer", reviewer: true }));
  d.render = {
    revision: 1,
    video: "secret-video",
    poster: "secret-poster",
    captions: "secret-vtt",
    duration: 3,
  };
  d.review = {
    revision: 1,
    userId: "reviewer",
    name: "Test Electrician",
    credential: "Fixture credentials only",
    at: d.createdAt,
  };
  d.publishConsent = { revision: 1, userId: "owner", at: d.createdAt };
  d.syncConfirmedRevision = 1;
  assert.deepEqual(publishProblems(d), []);
  d.status = "published";
  const p = publicLesson(d);
  assert.ok(p);
  assert.ok(!("ownerId" in p));
  assert.ok(!("calls" in p));
  assert.ok(!("sessions" in p));
  assert.ok(!("userId" in p.review));
  const edited = applyEdit(d, d.edit);
  assert.equal(edited.revision, 2);
  assert.equal(edited.render, undefined);
  assert.equal(edited.review, undefined);
  assert.equal(edited.publishConsent, undefined);
  assert.equal(edited.syncConfirmedRevision, undefined);
  assert.equal(publicLesson(edited), null);
  assert.ok(d.render);
  for (const field of ["siteConfirmed"]) {
    const bad = structuredClone(d);
    bad.job[field] = false;
    assert.ok(publishProblems(bad).length);
  }
  const missing = structuredClone(d);
  missing.calls = [];
  assert.ok(
    validateEvidence(missing, missing.edit).some((s) => s.includes("audio")),
  );
  const wrongOwner = structuredClone(d);
  wrongOwner.publishConsent.userId = "another";
  assert.ok(publishProblems(wrongOwner).some((s) => s.includes("permission")));
  const invalid = structuredClone(d.edit);
  invalid.clips[0].end = invalid.clips[0].start;
  assert.equal(editSchema.safeParse(invalid).success, false);
  const badBox = structuredClone(d.edit);
  Object.assign(badBox.clips[0], {
    freezeAt: 2,
    freezeSeconds: 2,
    annotations: [
      { id: "b", label: "part", kind: "box", x: 0.9, y: 0, w: 0.3, h: 0.2 },
    ],
  });
  assert.equal(editSchema.safeParse(badBox).success, false);
  const mistake = structuredClone(d.edit);
  mistake.clips[0].stepId = d.job.steps[2].id;
  mistake.clips[0].kind = "mistake";
  assert.ok(validateEvidence(d, mistake).some((s) => s.includes("correction")));
  mistake.clips.push({ ...mistake.clips[0], id: "fixed", kind: "correction" });
  assert.equal(validateEvidence(d, mistake).length, 0);
  const falseRule = structuredClone(d);
  falseRule.job.steps[0].tag = "new_here";
  falseRule.job.steps[0].ruleVerified = false;
  assert.ok(publishProblems(falseRule).some((s) => s.includes("regional")));
  const frozen = structuredClone(d);
  frozen.edit.clips[0].freezeAt = 2;
  frozen.edit.clips[0].freezeSeconds = 3;
  assert.equal(timeline(frozen.edit)[0].end, 6);
  const subtitles = vtt(frozen);
  assert.ok(subtitles.includes("00:00:04.000"));
  assert.ok(!subtitles.includes("<script>"));
  frozen.edit.captionEdits = [
    { callId: "call", turn: 0, text: "Corrected ASR caption" },
  ];
  assert.ok(vtt(frozen).includes("Corrected ASR caption"));
  assert.equal(
    frozen.calls[0].turns[0].text,
    "<script>test</script> I see LINE.",
  );
  const unaligned = evidenceProposal(d);
  assert.equal(unaligned.clips.length, 0);
  assert.ok(unaligned.issues.some((i) => i.includes("No reliable")));
  delete process.env.LESSON_SUPABASE_URL;
  delete process.env.LESSON_SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_LESSON_SUPABASE_ANON_KEY;
  const req = (url, body) =>
    new Request("http://localhost" + url, {
      method: "POST",
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await GET(new Request("http://localhost/api/lessons/config"), {
        params: { path: ["config"] },
      })
    ).status,
    200,
  );
  assert.deepEqual(
    await (
      await GET(new Request("http://localhost/api/lessons/public"), {
        params: { path: ["public"] },
      })
    ).json(),
    [],
  );
  assert.equal(
    (
      await GET(new Request("http://localhost/api/lessons/drafts"), {
        params: { path: ["drafts"] },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await POST(req("/api/lessons/drafts/x/publish", { revision: 1 }), {
        params: { path: ["drafts", "x", "publish"] },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await GET(new Request("http://localhost/api/lessons/public/x"), {
        params: { path: ["public", "x"] },
      })
    ).status,
    404,
  );
  console.log(
    "PASS lesson evidence policies, publication gates, isolation, edit invalidation, corrections, subtitles/freeze timing, unaligned sources, auth and unconfigured API behavior",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
module.exports = { fixture };
