// OWNER: Lessons feature. Set REACT_TEST_RENDERER and FAKE_INDEXEDDB to isolated test packages.
require("../../scripts/lessons/run.cjs");
const assert = require("node:assert/strict"),
  ts = require("typescript"),
  fs = require("fs"),
  Module = require("module");
const reactPath = require.resolve("react"),
  jsxPath = require.resolve("react/jsx-runtime"),
  resolve = Module._resolveFilename;
Module._resolveFilename = function (p, ...a) {
  return resolve.call(
    this,
    p === "react" ? reactPath : p === "react/jsx-runtime" ? jsxPath : p,
    ...a,
  );
};
require.extensions[".tsx"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
const { indexedDB } = require(process.env.FAKE_INDEXEDDB);
global.indexedDB = indexedDB;
const React = require("react"),
  { act, create } = require(process.env.REACT_TEST_RENDERER);
const client = require("../../lib/lessons/client.ts");
let finalized = 0,
  requests = 0;
client.lessonRequest = async (p, b) => {
  requests++;
  if (p.endsWith("/upload")) return { signedUrl: "https://upload.invalid" };
  if (p.endsWith("/finalize")) finalized++;
  return { ok: true };
};
global.self = global;
const events = {};
global.document = {
  visibilityState: "visible",
  addEventListener: (n, f) => (events[n] = f),
  removeEventListener: (n) => delete events[n],
};
let sourceStops = 0,
  cloneStops = 0;
const sourceTrack = {
  clone: () => ({ stop: () => cloneStops++ }),
  stop: () => sourceStops++,
};
global.MediaStream = class {
  constructor(tracks = [sourceTrack]) {
    this.tracks = tracks;
  }
  getVideoTracks() {
    return this.tracks;
  }
};
let lastRecorder;
global.MediaRecorder = class {
  static isTypeSupported(t) {
    return t === "video/webm";
  }
  constructor(stream) {
    this.stream = stream;
    this.state = "inactive";
    lastRecorder = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    if (this.state !== "recording") throw new Error("Invalid stop");
    this.state = "inactive";
    void this.onstop?.();
  }
  emit(blob) {
    this.ondataavailable?.({ data: blob });
  }
};
const {
  default: Recorder,
  recordingType,
} = require("../../components/lessons/Recorder.tsx");
const local = require("../../components/lessons/localMedia.ts");
const wait = () => new Promise((r) => setTimeout(r, 40));
(async () => {
  assert.equal(recordingType(), "video/webm");
  const stream = new MediaStream();
  let view;
  await act(async () => {
    view = create(
      React.createElement(Recorder, {
        workerId: "worker-demo",
        jobId: "demo-2041",
        videoRef: { current: { srcObject: stream } },
      }),
    );
    await wait();
  });
  const button = (text) =>
    view.root
      .findAllByType("button")
      .find((b) => b.children.join("").includes(text));
  await act(async () =>
    view.root.findByType("input").props.onChange({ target: { checked: true } }),
  );
  await act(async () => {
    await button("Record lesson").props.onClick();
  });
  assert.equal(lastRecorder.state, "recording");
  assert.equal(sourceStops, 0);
  assert.equal(lastRecorder.stream.getVideoTracks().length, 1);
  await act(async () => {
    events.visibilitychange();
  });
  assert.equal(
    lastRecorder.state,
    "recording",
    "visibility becoming visible must not stop capture",
  );
  global.fetch = async () => {
    throw new Error("network down");
  };
  await act(async () => {
    lastRecorder.emit(new Blob(["synthetic chunk"], { type: "video/webm" }));
    await wait();
    lastRecorder.stop();
    await wait();
  });
  let saved = await local.localSessions();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].count, 1);
  assert.ok(saved[0].endedAt);
  assert.ok((await local.readChunk(saved[0].id, 0)).size > 0);
  assert.equal(sourceStops, 0);
  assert.equal(cloneStops, 1);
  global.fetch = async () => {
    throw new Error("network down");
  };
  await act(async () => {
    await button("Upload / retry").props.onClick();
  });
  assert.equal((await local.localSessions()).length, 1);
  assert.equal(finalized, 0);
  global.fetch = async () => ({ ok: true });
  await act(async () => {
    await button("Upload / retry").props.onClick();
  });
  assert.equal(finalized, 1);
  assert.equal((await local.localSessions()).length, 0);
  assert.equal(sourceStops, 0);
  await act(async () => {
    view.unmount();
  });
  console.log(
    "PASS recorder: format negotiation, video-only cloned stream, local chunk persistence, stop/finalization, upload failure retention, safe retry and no interference with guidance camera",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
