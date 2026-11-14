// OWNER: Aniketh. Optional UI regression suite. Set REACT_TEST_RENDERER to an isolated
// react-test-renderer@18.3.1 installation. No production or shared dependencies added.
const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs"),
  Module = require("node:module");
const root = path.resolve(__dirname, "../..");
const ts = require(path.join(root, "node_modules/typescript"));
const reactPath = require.resolve("react"),
  jsxPath = require.resolve("react/jsx-runtime");
const original = Module._resolveFilename;
Module._resolveFilename = function (p, ...a) {
  return original.call(
    this,
    p === "react"
      ? reactPath
      : p === "react/jsx-runtime"
        ? jsxPath
        : p.startsWith("@/")
          ? path.join(root, p.slice(2))
          : p,
    ...a,
  );
};
require.extensions[".tsx"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
require.extensions[".ts"] = require.extensions[".tsx"];
const React = require("react"),
  { act, create } = require(process.env.REACT_TEST_RENDERER);
const Picker = require("./LocationPicker.tsx").default;
const callback = [];
let view;
const props = (id) => ({ jobId: id, onConfirm: (...v) => callback.push(v) });
const manual = () =>
  view.root.findByType("select").props.onChange({ target: { value: "0" } });
const confirm = () =>
  view.root
    .findAllByType("button")
    .find((b) => b.children.includes("Confirm this location")).props.onClick;
(async () => {
  global.window = { isSecureContext: true };
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: {
      geolocation: {
        getCurrentPosition(resolve) {
          resolve({
            coords: { latitude: 40.3431, longitude: -74.6551, accuracy: 5 },
          });
        },
      },
    },
  });
  await act(async () => {
    view = create(React.createElement(Picker, props("one")));
  });
  await act(async () => manual());
  let resolveFetch,
    signal,
    calls = 0;
  global.fetch = (_, init) => {
    calls++;
    signal = init.signal;
    return new Promise((r) => (resolveFetch = r));
  };
  let pending;
  await act(async () => {
    const handler = confirm();
    pending = handler();
    void handler();
  });
  assert.equal(calls, 1, "duplicate taps must issue one confirmation");
  await act(async () => {
    view.update(React.createElement(Picker, props("two")));
  });
  assert.equal(signal.aborted, true, "changing jobs cancels in-flight request");
  await act(async () => {
    resolveFetch({
      ok: true,
      json: async () => ({ id: "one", siteConfirmed: true }),
    });
    await pending;
  });
  assert.equal(
    callback.length,
    0,
    "old confirmation must not call the new job callback",
  );
  await act(async () => manual());
  global.fetch = async () => ({ ok: true, json: async () => null });
  await act(async () => {
    await confirm()();
  });
  assert.equal(callback.length, 0, "invalid acknowledgement must not confirm");
  assert.ok(JSON.stringify(view.toJSON()).includes("not acknowledged"));
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ id: "two", siteConfirmed: true }),
  });
  await act(async () => {
    await confirm()();
  });
  assert.equal(callback.length, 1);
  // A delayed GPS result after unmount must not send any coordinates.
  let resolveGPS;
  global.navigator.geolocation.getCurrentPosition = (resolve) =>
    (resolveGPS = resolve);
  calls = 0;
  global.fetch = async () => {
    calls++;
    throw new Error("unexpected");
  };
  await act(async () => {
    pending = view.root.findAllByType("button")[0].props.onClick();
  });
  await act(async () => {
    view.unmount();
    resolveGPS({ coords: { latitude: 40, longitude: -74, accuracy: 5 } });
    await pending;
  });
  assert.equal(calls, 0);
  console.log(
    "PASS UI: duplicate taps, job-switch cancellation, stale callback rejection, malformed acknowledgement, retry success, GPS completion after unmount",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
