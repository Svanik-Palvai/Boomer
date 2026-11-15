// OWNER: Lessons feature. node scripts/lessons/run.cjs [--once]
// Executes existing TypeScript directly using the repo's installed compiler, no new dependency.
const ts = require("typescript"),
  fs = require("fs"),
  path = require("path"),
  Module = require("module");
const root = path.resolve(__dirname, "../..");
for (const name of [".env", ".env.local"]) {
  const file = path.join(root, name);
  if (fs.existsSync(file))
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]])
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
}
const original = Module._resolveFilename;
Module._resolveFilename = function (p, ...a) {
  return original.call(
    this,
    p.startsWith("@/") ? path.join(root, p.slice(2)) : p,
    ...a,
  );
};
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
if (require.main === module) {
  (async () => {
    const { errors, warnings } = require("./preflight.cjs").preflight();
    for (const warning of warnings) console.warn(`[lessons] ${warning}`);
    for (const error of errors) console.error(`[lessons] ${error}`);
    if (errors.length) { process.exitCode = 1; return; }
    if (process.argv.includes("--check")) {
      console.log("PASS local lesson-worker prerequisites. Remote storage, auth, provider delivery and device capture still require end-to-end verification.");
      return;
    }
    const { workOnce } = require("../../lib/lessons/worker.ts");
    // Hosted scheduled runs drain available tasks, then exit without idle polling.
    // Finish any leased task before leaving; unfinished tasks remain durable.
    const drain = process.argv.includes("--drain"), deadline = Date.now() + 20 * 60 * 1000;
    do {
      const worked = await workOnce();
      if (process.argv.includes("--once")) break;
      if (drain && (!worked || Date.now() >= deadline)) break;
      if (!worked) await new Promise((r) => setTimeout(r, 3000));
    } while (true);
  })().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
