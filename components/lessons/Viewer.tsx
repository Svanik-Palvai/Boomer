"use client";
// OWNER: Lessons feature.
import { useEffect, useState, useRef } from "react";
export default function Viewer({
  id,
  chapters,
}: {
  id: string;
  chapters: { start: number; end: number; caption: string; kind: string }[];
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [transcript, setTranscript] = useState("");
  useEffect(() => {
    let active = true;
    void fetch(`/api/lessons/public/${id}/captions`, { cache: "no-store" })
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => {
        if (active) setTranscript(t);
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <>
      <video
        ref={video}
        controls
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
      <h2>Chapters</h2>
      {chapters.map((c, i) => (
        <p key={i}>
          <button
            onClick={() => {
              if (video.current) {
                video.current.currentTime = c.start;
                void video.current.play();
              }
            }}
          >
            {Math.floor(c.start / 60)}:
            {String(Math.floor(c.start % 60)).padStart(2, "0")} ·{" "}
            {c.kind.replaceAll("_", " ")}
          </button>{" "}
          {c.caption}
        </p>
      ))}
      <details>
        <summary>Edited lesson transcript</summary>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {transcript || "Transcript temporarily unavailable."}
        </pre>
      </details>
    </>
  );
}
