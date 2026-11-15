"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Wordmark from "./Wordmark";
import s from "./fieldHero.module.css";

const beats = [
  {
    label: "01 / DURING THE JOB",
    title: "See. Guide. Check.",
    text: "Camera frames and the voice call meet in one job. Say ‘done’ to request a check of what’s visible.",
    detail: "Photon + ElevenLabs voice · Gemini vision",
  },
  {
    label: "02 / AFTER THE JOB",
    title: "The experience stays.",
    text: "Step photos, corrections and local sources become a work record that follows the electrician.",
    detail: "Shared job memory · Photon iMessage",
  },
  {
    label: "03 / FOR THE NEXT ELECTRICIAN",
    title: "Turn the work into a lesson.",
    text: "Consented recordings become an editable lesson draft, with chapters, captions and labeled freeze frames.",
    detail: "Edit proposal → FFmpeg render → human review",
  },
];
export default function FieldHero() {
  const root = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    const media = matchMedia(
      "(min-width: 1000px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    const draw = () => {
      frame = 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = media.matches
        ? Math.max(
            0,
            Math.min(
              0.999,
              (76 - r.top) / Math.max(1, r.height - innerHeight + 76),
            ),
          )
        : 0;
      el.style.setProperty("--field-progress", String(p));
      setBeat(Math.floor(p * beats.length));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    draw();
    return () => {
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  const current = beats[beat];
  return (
    <section
      ref={root}
      id="problem"
      data-section
      className={s.hero}
      aria-label="Boomer for electricians"
    >
      <div className={s.stage}>
        <div className={s.topline}>
          <span>FIELD INTELLIGENCE / ELECTRICIANS</span>
          <span>HACKPRINCETON 2026</span>
        </div>
        <div className={s.layout}>
          <div className={s.copy}>
            <div className={s.wordmark}>
              <Wordmark />
              <span aria-hidden="true"> ↗</span>
            </div>
            <p className={s.hook}>
              Who’s building for the people
              <br />
              who build everything?
            </p>
            <h1>
              A second set of eyes.
              <br />
              <em>A guide in your ear.</em>
            </h1>
            <p className={s.description}>
              Strap on your phone. Call Boomer. Get step-by-step guidance
              grounded in your camera view, your job and local sources.
            </p>
            <div className={s.actions}>
              <Link href="/demo">
                Open live demo <span aria-hidden="true">↗</span>
              </Link>
              <a href="#correction">Watch the caught mistake ↓</a>
            </div>
            <p className={s.scope}>
              The electrician tests, decides and stays responsible.
            </p>
          </div>
          <figure className={s.visual}>
            <div className={s.photo}>
              {imageFailed ? (
                <p className={s.imageFallback}>
                  Field photograph unavailable.
                  <br />
                  Boomer connects the camera, call and job record.
                </p>
              ) : (
                <Image
                  onError={() => setImageFailed(true)}
                  src="/pitch/electrician-field.jpg"
                  alt="Electrician in protective equipment working at an outdoor electrical cabinet"
                  width={1600}
                  height={1067}
                  priority
                  sizes="(max-width: 999px) 100vw, 55vw"
                />
              )}
              <span className={s.photoLabel}>BUILT FOR THE FIELD</span>
            </div>
            <figcaption>
              <span>
                Field photography · illustrative, not a Boomer session
              </span>
              <a
                href="https://www.pexels.com/photo/electrician-by-fuse-box-17842832/"
                target="_blank"
                rel="noreferrer"
              >
                Fatih Yurtman / Pexels ↗
              </a>
            </figcaption>
            <div className={s.story}>
              <div
                className={s.storyTabs}
                aria-label="Explore the job lifecycle"
              >
                {beats.map((b, i) => (
                  <button
                    key={b.label}
                    aria-pressed={beat === i}
                    onClick={() => setBeat(i)}
                  >
                    {["Guide the work", "Keep the record", "Teach the next"][i]}
                  </button>
                ))}
              </div>
              <div className={s.storyBody}>
                <span>{current.label}</span>
                <h2>{current.title}</h2>
                <p>{current.text}</p>
                <small>{current.detail}</small>
              </div>
            </div>
          </figure>
        </div>
        <div className={s.bottomline}>
          <span>ONE JOB CONNECTS VOICE, VISION & LOCAL KNOWLEDGE.</span>
          <a href="#lessons-title">Recorded work → reviewed lessons ↗</a>
        </div>
      </div>
    </section>
  );
}
