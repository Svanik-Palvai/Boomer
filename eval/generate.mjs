// OWNER: Zohaib. Builds the step-check test images: generated scenes, then edits of them (the faults),
// using a Gemini image model. Labels come from eval/scenes.json. Skips images that already exist.
//   node eval/generate.mjs            (reads GEMINI_API_KEY from .env)
//   IMAGE_MODEL=gemini-3.1-flash-image node eval/generate.mjs
import fs from "node:fs";
import path from "node:path";

for (const f of [".env.local", ".env"]) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}

const MODEL = process.env.IMAGE_MODEL || "gemini-3-pro-image";
const KEY = process.env.GEMINI_API_KEY;
const OUT = "eval/images/gen";
const REAL = "eval/images/real";
const spec = JSON.parse(fs.readFileSync("eval/scenes.json", "utf8"));
fs.mkdirSync(OUT, { recursive: true });

async function image(parts) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"] } }),
    });
    const j = await r.json().catch(() => ({}));
    const img = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (img) return Buffer.from(img.data, "base64");
    console.error(`  attempt ${attempt} failed: ${r.status} ${JSON.stringify(j.error ?? j.candidates?.[0]?.finishReason ?? j).slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 3000 * attempt));
  }
  return null;
}

const file = (id) => [path.join(OUT, `${id}.png`), path.join(REAL, `${id}.jpg`)].find((p) => fs.existsSync(p));

for (const s of spec.scenes) {
  if (file(s.id)) continue;
  const t = Date.now();
  const buf = await image([{ text: `${spec.style}\n\n${s.prompt}` }]);
  if (buf) fs.writeFileSync(path.join(OUT, `${s.id}.png`), buf);
  console.log(`${s.id}: ${buf ? "ok" : "FAILED"} (${Date.now() - t} ms)`);
}

for (const e of spec.edits) {
  if (file(e.id)) continue;
  const src = file(e.from);
  if (!src) { console.log(`${e.id}: skipped, ${e.from} missing`); continue; }
  const t = Date.now();
  const mime = src.endsWith(".png") ? "image/png" : "image/jpeg";
  const buf = await image([{ inlineData: { mimeType: mime, data: fs.readFileSync(src).toString("base64") } }, { text: e.prompt }]);
  if (buf) fs.writeFileSync(path.join(OUT, `${e.id}.png`), buf);
  console.log(`${e.id}: ${buf ? "ok" : "FAILED"} (${Date.now() - t} ms)`);
}
