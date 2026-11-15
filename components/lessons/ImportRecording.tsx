"use client";
import { useRef, useState } from "react";
import { lessonRequest } from "@/lib/lessons/client";
import type { LessonDraft } from "@/lib/lessons/types";
import { parseTranscript } from "@/lib/lessons/transcript";

export default function ImportRecording({ draft, refresh }: { draft: LessonDraft; refresh: () => Promise<void> }) {
  const [file, setFile] = useState<File>(), [transcript, setTranscript] = useState(""),
    [startedAt, setStartedAt] = useState(""), [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const pending = useRef<{ sessionId: string; startedAt: string; duration: number }>();
  async function upload() {
    if (!file || !consent || busy) return;
    setBusy(true);
    try {
      const turns = parseTranscript(transcript);
      if (!Array.isArray(turns) || !turns.length) throw new Error("Supply a timestamped transcript array.");
      const mime = file.name.toLowerCase().endsWith(".webm") ? "video/webm" : "video/mp4";
      if (!pending.current) {
        const started = new Date(startedAt);
        if (!Number.isFinite(started.getTime())) throw new Error("Enter the original recording start time.");
        const url = URL.createObjectURL(file), video = document.createElement("video");
        let duration: number;
        try {
          duration = await new Promise<number>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Cannot read recording duration. Export a standard MP4 and retry.")), 15000);
            video.onloadedmetadata = () => { clearTimeout(timer); resolve(video.duration); };
            video.onerror = () => { clearTimeout(timer); reject(new Error("Recording cannot be opened.")); };
            video.src = url;
          });
        } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); }
        if (!Number.isFinite(duration) || duration <= 0 || duration > 900) throw new Error("Use a recording up to 15 minutes with readable duration metadata.");
        pending.current = { sessionId: crypto.randomUUID(), startedAt: started.toISOString(), duration };
      }
      const source = pending.current;
      if (turns.some(t => !t || typeof t.role !== "string" || typeof t.text !== "string" || !Number.isFinite(t.start) || !Number.isFinite(t.end) || t.start < 0 || t.end <= t.start || t.end > source.duration))
        throw new Error("Transcript rows need role, text, start and end in seconds within the video.");
      await lessonRequest(`drafts/${draft.id}/session`, { sessionId: source.sessionId, startedAt: source.startedAt, mime });
      const size = 20 * 1024 * 1024, count = Math.ceil(file.size / size);
      for (let index = 0; index < count; index++) {
        setMessage(`Uploading part ${index + 1} of ${count}…`);
        const chunk = file.slice(index * size, (index + 1) * size);
        const signed = await lessonRequest(`drafts/${draft.id}/upload`, { sessionId: source.sessionId, index, size: chunk.size });
        if (!signed.alreadyUploaded) {
          const response = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: chunk, signal: AbortSignal.timeout(120000) });
          if (!response.ok) throw new Error("Upload failed. Keep this page open and retry; completed parts are retained.");
        }
      }
      await lessonRequest(`drafts/${draft.id}/finalize`, { ...source, count, endedAt: new Date(Date.parse(source.startedAt) + source.duration * 1000).toISOString(), interruptions: [] });
      await lessonRequest(`drafts/${draft.id}/import-audio`, { sessionId: source.sessionId, turns, consent: true });
      setMessage("Recording uploaded. Lesson preparation is queued. Refresh in a few minutes to open the prepared draft.");
      await refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Import failed. Retry with the original file."); }
    finally { setBusy(false); }
  }
  return <details>
    <summary>Import a recording without a phone-call provider</summary>
    <p>Upload the original MP4 or WebM with its recorded audio and a timestamped transcript. No ElevenLabs account is required. Use the original recording time so the worker can align job steps; otherwise select clip intervals manually.</p>
    <label>Original recording<input type="file" accept="video/mp4,video/webm,.mp4,.webm" disabled={busy || !!pending.current} onChange={e => setFile(e.target.files?.[0])} /></label>
    <label>Recording started (your local time)<input type="datetime-local" disabled={busy || !!pending.current} value={startedAt} onChange={e => setStartedAt(e.target.value)} /></label>
    <label>Transcript file (WebVTT or SRT)<input type="file" accept=".vtt,.srt,.json,text/vtt,text/plain,application/json" disabled={busy} onChange={async e => {
      try { const selected = e.target.files?.[0]; if (!selected) return; if (selected.size > 1000000) throw new Error("Transcript must be under 1 MB."); setTranscript(await selected.text()); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Cannot open transcript"); }
    }} /></label>
    <label>Or paste timestamped subtitles<textarea disabled={busy} value={transcript} onChange={e => setTranscript(e.target.value)} placeholder={'00:00:01.000 --> 00:00:03.000\nShow the LINE terminals.'} /></label>
    <label><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />I have permission to upload this recording and transcript for private lesson preparation. Publishing requires separate permission.</label>
    <button disabled={busy || !file || !transcript || !startedAt || !consent} onClick={upload}>{busy ? "Importing…" : "Upload and prepare lesson"}</button>
    <p role="status">{message}</p>
  </details>;
}
