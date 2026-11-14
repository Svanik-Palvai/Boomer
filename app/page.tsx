"use client";
// OWNER: Teammate 1 (screens). Screen 1: Snap.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";
import { ActionBar, Banner, FlowSteps, Tape } from "@/components/screens/shell";
import { CameraIcon } from "@/components/screens/Icons";
import s from "@/components/screens/snap.module.css";

type Identity = { component: string; task: string; confidence: number };

/** Downscale to 1024px on the long edge so the upload stays small on venue Wi-Fi. */
async function toDataUrl(file: File, max = 1024): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function SnapPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Identity | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  }

  async function identify() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const photo = await toDataUrl(file);
      const r = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo, note: note.trim() || undefined }),
      });
      if (!r.ok) throw new Error(`server returned ${r.status}`);
      setResult((await r.json()) as Identity);
    } catch (e) {
      setError(`Couldn't identify the job (${e instanceof Error ? e.message : "network error"}). Try again or use the demo photo.`);
    } finally {
      setBusy(false);
    }
  }

  const unsure = result && result.confidence < 0.6;
  const next = () => router.push(`/job/${DEMO_CASE_ID}/checks`);

  return (
    <main>
      <div className={s.mark}><Tape size="large">Boomer</Tape></div>
      <FlowSteps current="Snap" />
      <h1>Photograph the job</h1>
      <p className={s.lede}>One photo of the part you&apos;re working on. Boomer works out the town, its code, and what&apos;s new here.</p>

      <label className={s.target}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={preview ? "Retake the photo" : "Take a photo of the job"}
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="The job photo" className={`${s.photo} ${busy ? s.dim : ""}`} />
        ) : (
          <span className={s.targetLabel}>
            <CameraIcon size={40} />
            Take a photo
          </span>
        )}
      </label>

      {!result && (
        <label className={s.note}>
          <span className={s.noteLabel}>Note, if it helps (optional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Replacing the island outlet" />
        </label>
      )}

      {result && (
        <div className={s.result} role="status">
          {unsure ? (
            <>
              <p className={s.resultMain}>Not sure what this is</p>
              <p className="muted">Retake it closer and straight on, or use the demo photo.</p>
            </>
          ) : (
            <>
              <p className={s.resultMain}>This looks like a {result.component}.</p>
              <p className="muted">Task: {cap(result.task)}. If that&apos;s wrong, tap the photo to retake it.</p>
            </>
          )}
        </div>
      )}

      {error && <Banner tone="error">{error}</Banner>}

      <div className={s.links}>
        <Link href={`/job/${DEMO_CASE_ID}/checks`}>Use the demo photo</Link>
        <Link href="/playbook">Playbook</Link>
      </div>

      <ActionBar>
        {result && !unsure ? (
          <button type="button" className="btn" onClick={next}>Looks right</button>
        ) : (
          <button type="button" className="btn" disabled={!file || busy} onClick={identify}>
            {busy ? "Identifying the job…" : "Identify job"}
          </button>
        )}
      </ActionBar>
    </main>
  );
}
