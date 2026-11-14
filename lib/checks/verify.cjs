// Run: node lib/checks/verify.cjs (uses the existing TypeScript dependency).
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const Module = require("node:module");
const root = path.resolve(__dirname, "../..");
const original = Module._resolveFilename;
Module._resolveFilename = function (p, ...args) {
  return original.call(
    this,
    p.startsWith("@/") ? path.join(root, p.slice(2)) : p,
    ...args,
  );
};
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
const { demoCase } = require("../mock/demoCase.ts");
const { runChecks, rules } = require("./runChecks.ts");
const { advanceGuide, guideUnlocked } = require("./guide.ts");
const { getJurisdiction, validCoordinates } = require("./jurisdiction.ts");
(async () => {
  const c = demoCase();
  assert.equal(guideUnlocked(c), false);
  assert.throws(() => advanceGuide(c, "s3"));
  c.status = "approved";
  assert.equal(guideUnlocked(c), false);
  c.reviews[0].decision = "confirmed";
  c.reviews[1].decision = "approved";
  assert.equal(guideUnlocked(c), true);
  assert.throws(() => advanceGuide(c, "s4"));
  const a = advanceGuide(c, "s3");
  assert.equal(a.status, "guiding");
  assert.deepEqual(a.arProgress, ["s3"]);
  assert.deepEqual(advanceGuide(a, "s3"), a);
  assert.equal(advanceGuide(a, "s4").status, "done");
  assert.equal(c.arProgress, undefined);
  const checks = runChecks(c.job);
  assert.equal(
    checks.filter((k) => k.type === "rule_difference" && k.status === "found")
      .length,
    0,
  );
  const island = { ...c.job, component: "kitchen island receptacle" };
  assert.equal(runChecks(island).filter((k) => k.ruleId).length, 2);
  assert.equal(
    runChecks({ ...island, home: island.site }).filter((k) => k.ruleId).length,
    0,
  );
  assert.equal(
    runChecks({ ...island, site: { ...island.site, city: "Trenton" } }).filter(
      (k) => k.ruleId,
    ).length,
    0,
  );
  for (const r of rules) {
    assert.ok(r.verified);
    assert.ok(r.sourceUrl.startsWith("https://"));
    assert.ok(r.caveat);
    for (const s of r.addsSteps)
      assert.ok(
        require("../../data/arSteps.json").some((a) => a.id === s.arStepId),
      );
  }
  assert.equal(validCoordinates(NaN, 0), false);
  assert.equal(validCoordinates(91, 0), false);
  assert.equal(validCoordinates(40, -74), true);
  await assert.rejects(() => getJurisdiction(100, 0));
  const fetchOriginal = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      address: {
        town: "Princeton",
        country_code: "us",
        "ISO3166-2-lvl4": "US-NJ",
      },
    }),
  });
  assert.equal((await getJurisdiction(40.3431, -74.6551)).city, "Princeton");
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      address: {
        city: "Trenton",
        country_code: "us",
        "ISO3166-2-lvl4": "US-NJ",
      },
    }),
  });
  assert.equal((await getJurisdiction(40, -74)).necEdition, "needs review");
  global.fetch = async () => ({ ok: false });
  await assert.rejects(() => getJurisdiction(40, -74));
  global.fetch = fetchOriginal;
  const caseStore = require("../cases/store.ts");
  const progressRoute = require("../../app/job/[id]/guide/progress/route.ts");
  const locationRoute = require("../../app/api/jurisdiction/route.ts");
  const checksRoute = require("../../app/api/checks/route.ts");
  const request = (url, body) =>
    new Request("http://localhost" + url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await checksRoute.POST(request("/api/checks", {}))).status,
    400,
  );
  assert.equal(
    (await checksRoute.POST(request("/api/checks", c.job))).status,
    200,
  );
  assert.equal(
    (await locationRoute.GET(new Request("http://localhost/api/jurisdiction")))
      .status,
    400,
  );
  assert.equal(
    (
      await locationRoute.POST(
        request("/api/jurisdiction", {
          caseId: c.id,
          city: "Unknown",
          state: "NJ",
        }),
      )
    ).status,
    422,
  );
  await caseStore.saveCase(c);
  let response = await progressRoute.POST(
    request("/progress", { stepId: "s3" }),
    { params: { id: c.id } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).arProgress, ["s3"]);
  assert.deepEqual((await caseStore.getCase(c.id)).arProgress, ["s3"]);
  response = await locationRoute.POST(
    request("/api/jurisdiction", {
      caseId: c.id,
      city: "Philadelphia",
      state: "PA",
    }),
  );
  assert.equal(response.status, 200);
  const relocated = await response.json();
  assert.equal(relocated.plan.length, 0);
  assert.equal(relocated.status, "checks_done");
  assert.equal(relocated.reviews[1].decision, "pending");
  response = await progressRoute.POST(request("/progress", { stepId: "s4" }), {
    params: { id: c.id },
  });
  assert.equal(response.status, 409);
  assert.equal(
    (
      await progressRoute.POST(request("/progress", { stepId: "s3" }), {
        params: { id: "missing" },
      })
    ).status,
    404,
  );
  await caseStore.resetDemoCase();
  console.log(
    "PASS: route validation, location invalidation, stored progress and approval rejection",
  );
  console.log(
    "PASS: approval gates, ordered/idempotent progress, completion, immutability, rule scope, same-edition/unknown towns, source/overlay integrity, coordinate validation, real-lookup response handling and outage fallback",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
