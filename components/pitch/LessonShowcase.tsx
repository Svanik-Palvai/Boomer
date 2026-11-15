"use client";
// OWNER: Pitch presentation. Read only the existing published projection; raw source media stays private.
import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./lessonShowcase.module.css";
interface Published {
  id: string;
  title: string;
  description: string;
}
export default function LessonShowcase() {
  const [lesson, setLesson] = useState<Published | null>(null);
  const [state, setState] = useState<
    "loading" | "ready" | "empty" | "unavailable"
  >("loading");
  const [mediaError, setMediaError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    fetch("/api/lessons/public", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const data: unknown = await r.json();
        if (!Array.isArray(data)) throw new Error();
        const first = data.find(
          (d) => typeof d?.id === "string" && typeof d?.title === "string",
        );
        setLesson(first ?? null);
        setState(first ? "ready" : "empty");
      })
      .catch(() => {
        if (
          !controller.signal.aborted ||
          !controller.signal.reason?.includes?.("unmount")
        )
          setState("unavailable");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort("unmount");
    };
  }, []);
  const base = lesson
    ? `/api/lessons/public/${encodeURIComponent(lesson.id)}`
    : "";
  return (
    <section
      className={s.showcase}
      aria-label="Recording to reviewed lesson evidence"
    >
      <noscript>
        Browse the <a href="/lessons">lesson library</a> for published lessons.
        Private recordings require review and permission before publication.
      </noscript>
      <div className={s.columns}>
        <article>
          <span className={s.label}>01 / THE ORIGINAL EVIDENCE</span>
          <h3>Keep the source. Shape the lesson.</h3>
          <p>
            Original camera recording, call audio, timestamped transcript and
            step results stay in the private editor. The reviewer selects clips,
            checks synchronization and retains the mistake alongside its
            correction.
          </p>
          <Link href="/lessons/workspace">
            Open private editor workspace ↗
          </Link>
          <small>
            Team sign-in required. Raw recordings are never exposed by this
            public page.
          </small>
        </article>
        <article>
          <span className={s.label}>02 / THE REVIEWED OUTPUT</span>
          {lesson ? (
            <>
              <h3>{lesson.title}</h3>
              {mediaError ? (
                <p role="alert">
                  Playback is unavailable. Open the lesson to retry.
                </p>
              ) : (
                <video
                  key={lesson.id}
                  controls
                  playsInline
                  preload="none"
                  poster={`${base}/poster`}
                  onError={() => setMediaError(true)}
                  aria-label={lesson.title}
                >
                  <source src={`${base}/video`} type="video/mp4" />
                  <track
                    kind="captions"
                    src={`${base}/captions`}
                    srcLang="en"
                    label="English"
                    default
                  />
                </video>
              )}
              <Link href={`/lessons/${encodeURIComponent(lesson.id)}`}>
                Chapters, transcript & sources ↗
              </Link>
            </>
          ) : (
            <>
              <h3>
                {state === "loading"
                  ? "Checking published lessons…"
                  : state === "unavailable"
                    ? "Library temporarily unavailable."
                    : "The real session comes next."}
              </h3>
              <p>
                {state === "empty"
                  ? "The pipeline is implemented. A consented inert-prop session still needs to be recorded, edited, rendered and reviewed before a real lesson appears here."
                  : "Only published, reviewed revisions can appear here. The pitch remains available while the lesson library loads."}
              </p>
              <Link href="/lessons">Open the lesson library ↗</Link>
            </>
          )}
          <small>
            Inert demonstration · simulated electrical tests · Observed by
            Boomer
          </small>
        </article>
      </div>
    </section>
  );
}
