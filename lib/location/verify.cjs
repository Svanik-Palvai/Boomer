// OWNER: Aniketh. Run node lib/location/verify.cjs
const ts = require("typescript"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  original = Module._resolveFilename;
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
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText,
    f,
  );
const { jobTemplate, templateReview } = require("./steps.ts"),
  { differencesFor } = require("./rules.ts"),
  { PRINCETON, PHILADELPHIA, findTown } = require("./towns.ts");
const { buildPlan } = require("../ai/buildPlan.ts"),
  db = require("../db/index.ts");
const route = require("../../app/api/jurisdiction/route.ts"),
  gaps = require("../../app/api/gaps/route.ts");
const post = (b) =>
  route.POST(
    new Request("http://localhost/api/jurisdiction", {
      method: "POST",
      body: JSON.stringify(b),
    }),
  );
(async () => {
  const t = jobTemplate("gfci-swap");
  assert.equal(t.steps.length, 6);
  assert.equal(t.steps.filter((s) => s.hardGate).length, 2);
  assert.ok(
    t.steps.filter((s) => s.hardGate).every((s) => s.check.kind === "spoken"),
  );
  assert.equal(templateReview("gfci-swap").status, "pending");
  t.steps[0].text = "mutated";
  assert.notEqual(jobTemplate("gfci-swap").steps[0].text, "mutated");
  assert.equal(jobTemplate("unknown"), undefined);
  assert.ok(
    buildPlan("gfci-swap", PHILADELPHIA, PRINCETON).every(
      (s) => s.tag === "standard",
    ),
  );
  assert.equal(
    differencesFor("island-receptacle", PHILADELPHIA, PRINCETON).length,
    2,
  );
  assert.equal(
    differencesFor("island-receptacle", PRINCETON, PRINCETON).length,
    0,
  );
  assert.equal(
    differencesFor("island-receptacle", PHILADELPHIA, {
      ...PRINCETON,
      necEdition: "2020",
    }).length,
    0,
  );
  assert.equal(findTown(" princeton ", "nj").city, "Princeton");
  assert.equal((await post(null)).status, 400);
  assert.equal(
    (await post({ jobId: "demo-2041", city: "Princeton" })).status,
    400,
  );
  assert.equal(
    (await post({ jobId: "demo-2041", lat: 40, lng: -74, accuracy: 5000 }))
      .status,
    400,
  );
  assert.equal(
    (await post({ jobId: "missing", city: "Princeton", state: "NJ" })).status,
    404,
  );
  assert.equal(
    (await post({ jobId: "demo-2041", city: "Unknown", state: "NJ" })).status,
    422,
  );
  await db.resetDemo();
  let response = await post({
    jobId: "demo-2041",
    city: "Philadelphia",
    state: "PA",
    confirmed: true,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).siteConfirmed, true);
  await db.updateJob("demo-2041", (j) => ({ ...j, status: "guiding" }));
  response = await post({ jobId: "demo-2041", city: "Princeton", state: "NJ" });
  assert.equal(response.status, 409);
  assert.equal((await db.getJob("demo-2041")).site.city, "Philadelphia");
  response = await post({
    jobId: "demo-2041",
    city: "Philadelphia",
    state: "PA",
    confirmed: true,
  });
  assert.equal(response.status, 200);
  await db.updateJob("demo-2041", (j) => ({ ...j, status: "done" }));
  assert.equal(
    (await post({ jobId: "demo-2041", city: "Philadelphia", state: "PA" }))
      .status,
    409,
  );
  assert.equal(
    (
      await gaps.GET(
        new Request("http://localhost/api/gaps?from=invalid&to=NJ"),
      )
    ).status,
    400,
  );
  const items = await (
    await gaps.GET(new Request("http://localhost/api/gaps?from=pa&to=nj"))
  ).json();
  assert.ok(items.length > 1);
  assert.ok(
    items.every((g) => g.sourceUrl.startsWith("https://") && !g.coveredBy),
  );
  const { getJurisdiction, validCoordinates } = require("./jurisdiction.ts");
  assert.equal(validCoordinates(100, 0), false);
  await assert.rejects(() => getJurisdiction(NaN, 0));
  const originalFetch = global.fetch;
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
  assert.equal((await getJurisdiction(40.34, -74.65)).city, "Princeton");
  assert.equal((await getJurisdiction(40.34, -74.65)).necEdition, "2023");
  const realNow = Date.now;
  let clock = realNow() + 100000;
  Date.now = () => clock;
  async function lookupWith(address, lat = 41) {
    clock += 2000;
    global.fetch = async () => ({ ok: true, json: async () => ({ address }) });
    return getJurisdiction(lat, -75);
  }
  try {
    const unknown = await lookupWith({
      town: "Unresearched",
      country_code: "us",
      "ISO3166-2-lvl4": "US-NJ",
    });
    assert.equal(unknown.necEdition, "needs review");
    clock += 2000;
    global.fetch = async () => ({ ok: true, json: async () => null });
    await assert.rejects(() => getJurisdiction(42, -75), /Town could not/);
    await assert.rejects(() => getJurisdiction(42.1, -75), /wait a moment/);
    await assert.rejects(
      () =>
        lookupWith(
          { town: "Toronto", country_code: "ca", "ISO3166-2-lvl4": "CA-ON" },
          43,
        ),
      /Only US/,
    );
    await assert.rejects(
      () =>
        lookupWith(
          { town: "Princeton", country_code: "us", "ISO3166-2-lvl4": {} },
          44,
        ),
      /Town could not/,
    );
    clock += 2000;
    global.fetch = async () => {
      throw new Error("network");
    };
    await assert.rejects(
      () => getJurisdiction(45, -75),
      /could not be reached/,
    );
    clock += 2000;
    global.fetch = async () => ({ ok: false });
    await assert.rejects(() => getJurisdiction(46, -75), /unavailable/);
    clock += 2000;
    let requests = 0;
    global.fetch = async () => {
      requests++;
      return {
        ok: true,
        json: async () => ({
          address: {
            town: "Princeton",
            country_code: "us",
            "ISO3166-2-lvl4": "US-NJ",
          },
        }),
      };
    };
    const [one, two] = await Promise.all([
      getJurisdiction(47, -75),
      getJurisdiction(47, -75),
    ]);
    assert.equal(requests, 1);
    one.city = "changed";
    assert.equal(two.city, "Princeton");
    assert.equal((await getJurisdiction(47, -75)).city, "Princeton");
    assert.equal(requests, 1);
  } finally {
    Date.now = realNow;
    global.fetch = originalFetch;
  }
  console.log(
    "PASS geocoder null/malformed/foreign responses, unknown town, rate limit, network/HTTP failure, concurrent deduplication and cache isolation",
  );
  global.fetch = originalFetch;
  await db.resetDemo();
  console.log(
    "PASS templates, hard gates, clone isolation, truthful tags, edition filtering, route validation, canonical town confirmation, atomic active/closed-job protection, gap uncertainty and GPS response/cache",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
