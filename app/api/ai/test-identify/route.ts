// OWNER: Sunny (AI). Open http://localhost:3000/api/ai/test-identify on a phone or laptop,
// pick or take a photo, and see what identifyJob returns. Dev tool only, not part of the demo UI.
export const dynamic = "force-dynamic";

const PAGE = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>identifyJob test</title>
<style>
  body{font-family:system-ui;background:#0f1115;color:#eee;max-width:480px;margin:0 auto;padding:16px}
  input,textarea,button{width:100%;font-size:16px;margin:8px 0;padding:10px;border-radius:8px;border:0}
  button{background:#2f6fed;color:#fff}
  img{max-width:100%;border-radius:8px}
  pre{background:#1a1d24;padding:12px;border-radius:8px;white-space:pre-wrap}
</style></head>
<body>
<h2>identifyJob test</h2>
<input id="file" type="file" accept="image/*" capture="environment">
<textarea id="note" placeholder="Optional note, e.g. replacing the outlet by the sink"></textarea>
<button id="go">Identify</button>
<img id="preview">
<pre id="out">Pick a photo, then Identify.</pre>
<script>
const $ = (id) => document.getElementById(id);
let dataUrl = "";
// shrink the photo to 1024px so uploads are fast and use less of the Gemini quota
$("file").onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const s = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = img.width * s; c.height = img.height * s;
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    dataUrl = c.toDataURL("image/jpeg", 0.85);
    $("preview").src = dataUrl;
  };
  img.src = URL.createObjectURL(f);
};
$("go").onclick = async () => {
  if (!dataUrl) { $("out").textContent = "Pick a photo first."; return; }
  $("out").textContent = "Asking Gemini...";
  const t = Date.now();
  const r = await fetch("/api/identify", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo: dataUrl, note: $("note").value }) });
  const j = await r.json();
  $("out").textContent = JSON.stringify(j, null, 2) + "\\n\\n" + ((Date.now() - t) / 1000) + "s";
};
</script>
</body></html>`;

export async function GET() {
  return new Response(PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
