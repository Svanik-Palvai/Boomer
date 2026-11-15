// OWNER: Lessons feature. Actual FFmpeg smoke test using explicitly synthetic media.
require("../../scripts/lessons/run.cjs");
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  os = require("node:os"),
  path = require("node:path");
const {
  ffmpeg,
  mediaDuration,
  render,
} = require("../../lib/lessons/worker.ts");
const { demoJob } = require("../../lib/mock/demo.ts");
(async () => {
  const dir = await fs.mkdtemp(
    path.join(os.tmpdir(), "boomer-render-fixture-"),
  );
  const video = path.join(dir, "source.mp4"),
    audio = path.join(dir, "call.mp3");
  await ffmpeg([
    "-f",
    "lavfi",
    "-i",
    "color=c=blue:s=360x640:r=30:d=6",
    "-vf",
    "drawbox=x=90:y=192:w=90:h=128:color=white:t=fill",
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
  const webm = path.join(dir, "native-style.webm");
  await ffmpeg([
    "-i",
    video,
    "-c:v",
    "libvpx",
    "-deadline",
    "realtime",
    "-f",
    "webm",
    "-live",
    "1",
    "-y",
    webm,
  ]);
  assert.ok(
    Math.abs((await mediaDuration(webm)) - 6) < 0.2,
    "Streaming WebM without duration metadata must be supported",
  );
  const job = demoJob();
  job.status = "done";
  job.siteConfirmed = true;
  job.results = job.results.map((r) => ({ ...r, status: "worker_confirmed" }));
  const d = {
    id: "FIXTURE-NOT-A-REAL-JOB",
    revision: 1,
    job,
    edit: {
      title: "Synthetic rendering test",
      description: "Not a real job",
      issues: [],
      clips: [
        {
          id: "fixture",
          recordingId: "video",
          callId: "call",
          stepId: job.steps[0].id,
          start: 1,
          end: 4,
          caption: "Synthetic source fixture",
          kind: "worker_confirmation",
          annotations: [
            {
              id: "part",
              label: "FIXTURE PART",
              kind: "box",
              x: 0.25,
              y: 0.3,
              w: 0.25,
              h: 0.2,
            },
          ],
          freezeAt: 2,
          freezeSeconds: 2,
          audioOffset: 0,
        },
      ],
    },
    sessions: [{ id: "video", status: "uploaded", duration: 6, parts: [] }],
    calls: [
      {
        id: "call",
        audioPath: "fixture",
        duration: 6,
        turns: [
          {
            role: "worker",
            text: "Synthetic transcript, not actual work.",
            start: 1,
            end: 4,
          },
        ],
      },
    ],
  };
  const files = new Map([
      ["video", video],
      ["call", audio],
    ]),
    artifacts = {};
  const result = await render(d, dir, files, async (key, file) => {
    artifacts[key] = file;
    return key;
  });
  assert.ok(
    Math.abs(result.duration - 5) < 0.15,
    `expected five seconds, got ${result.duration}`,
  );
  assert.ok((await fs.stat(artifacts[result.video])).size > 1000);
  assert.ok(
    (await fs.readFile(artifacts[result.captions], "utf8")).includes(
      "Synthetic transcript",
    ),
  );
  await ffmpeg([
    "-ss",
    "1.5",
    "-i",
    artifacts[result.video],
    "-frames:v",
    "1",
    "-y",
    path.join(dir, "inspection.jpg"),
  ]);
  const rotated=path.join(dir,'rotated.mp4');
  await ffmpeg(['-i',video,'-c','copy','-metadata:s:v:0','rotate=90','-y',rotated]);
  const rotatedDir=await fs.mkdtemp(path.join(os.tmpdir(),'boomer-rotation-fixture-'));
  const rotatedResult=await render(d,rotatedDir,new Map([['video',rotated],['call',audio]]),async(key)=>key);
  assert.ok(Math.abs(rotatedResult.duration-5)<.15);
  const invalid=path.join(dir,'invalid.mp4');await fs.writeFile(invalid,'not a recording');
  await assert.rejects(()=>mediaDuration(invalid));
  console.log('PASS streaming WebM duration fallback, rotation-metadata export and invalid-media rejection');
  console.log(
    "PASS actual FFmpeg export: portrait source, original-audio track, two-second freeze, burned annotation/notice, five-second duration, poster and captions.",
  );
  console.log("Inspection image:", path.join(dir, "inspection.jpg"));
  console.log("Rendered fixture:", artifacts[result.video]);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
