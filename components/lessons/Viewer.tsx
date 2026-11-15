"use client";
// OWNER: Lessons feature.
import { useEffect, useState, useRef } from "react";
import styles from "./lessons.module.css";
export default function Viewer({
  id,
  chapters,
}: {
  id: string;
  chapters: { start: number; end: number; caption: string; kind: string }[];
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [transcript, setTranscript] = useState("");
  const [time, setTime] = useState(0);
  const [playbackError, setPlaybackError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/lessons/public/${id}/captions`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        if (active) setTranscript(t);
      }).catch(() => { if (active) setTranscript(""); });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <video
        ref={video}
        controls
        onTimeUpdate={() => setTime(video.current?.currentTime ?? 0)}
        onError={() => setPlaybackError("Video is unavailable. The lesson may have been withdrawn; refresh to check its status.")}
        playsInline
        preload="metadata"
        style={{ width: "100%" }}
        poster={`/api/lessons/public/${id}/poster`}
        src={`/api/lessons/public/${id}/video`}
        crossOrigin="anonymous"
      >
        <track
          default
          kind="captions"
          label="Original conversation"
          srcLang="en"
          src={`/api/lessons/public/${id}/captions`}
        />
      </video>
      {playbackError && <p role="alert">{playbackError}</p>}
      <h2>Follow the repair</h2>
      <ol className={styles.chapterList}>
      {chapters.map((c, i) => (
        <li key={i}>
          <button className={styles.chapter} aria-current={time >= c.start && time < c.end ? "true" : undefined}
            onClick={() => {
              if (video.current) {
                video.current.currentTime = c.start;
                void video.current.play().catch(() => setPlaybackError("Press play on the video to continue."));
              }
            }}>
            <time>{Math.floor(c.start / 60)}:{String(Math.floor(c.start % 60)).padStart(2, "0")}</time>
            <span><small>{c.kind.replaceAll("_", " ")}</small>{c.caption}</span>
          </button>
        </li>
      ))}
      </ol>
      <details>
        <summary>Edited lesson transcript</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {transcript || "Transcript temporarily unavailable."}
        </pre>
      </details>
    </>
  );
}
