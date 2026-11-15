"use client";
// OWNER: Pitch presentation. Sponsor angles from the team brief, grounded in implemented modules.
import { useState } from "react";
import { tracks } from "./judging";
import s from "./technical.module.css";
export default function JudgeTracks() {
  const [index, setIndex] = useState(0);
  const track = tracks[index];
  return (
    <section id="track-evidence" className={s.tracks}>
      <div className={s.label}>
        <span>07 / CHOOSE YOUR JUDGING ANGLE</span>
        <span>SHOW THE WORK. OPEN THE CODE.</span>
      </div>
      <div className={s.heading}>
        <h2>
          Built for the field.
          <br />
          <em>Engineered in depth.</em>
        </h2>
        <p>
          Explore the parts behind each track: voice agents, iMessage workflows,
          Gemini vision and the practical product around them.
        </p>
      </div>
      <div className={s.trackButtons} role="group" aria-label="Judging track">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
          >
            {t.short}
          </button>
        ))}
      </div>
      <article className={s.trackPanel} aria-live="polite" aria-atomic="true">
        <span className={s.micro}>{track.name}</span>
        <h3>{track.headline}</h3>
        <p className={s.trackIntro}>{track.intro}</p>
        <ol className={s.chain} aria-label="Technical workflow">
          {track.chain.map((step, i) => (
            <li key={step}>
              <span>0{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <div className={s.evidence}>
          {track.evidence.map(([title, copy]) => (
            <div key={title}>
              <h4>{title}</h4>
              <p>{copy}</p>
            </div>
          ))}
        </div>
        <div className={s.inspect}>
          <div>
            <span className={s.micro}>WHAT TO ASK US TO SHOW</span>
            <p>{track.inspect}</p>
          </div>
          <div>
            <a href={track.link}>{track.linkLabel} ↗</a>
            <a
              href={`https://github.com/Svanik-Palvai/Boomer/blob/codex/reviewed-video-lessons/${track.source}`}
              target="_blank"
              rel="noreferrer"
            >
              Open the implementation ↗
            </a>
          </div>
        </div>
        <p className={s.trackNote}>
          <strong>Evidence status: </strong>
          {track.note}
        </p>
      </article>
      <noscript>
        <div className={s.staticTracks}>
          <h3>All judging angles</h3>
          {tracks.map((t) => (
            <article key={t.id}>
              <h4>{t.name}</h4>
              <p>{t.intro}</p>
              <p>{t.inspect}</p>
              <a
                href={`https://github.com/Svanik-Palvai/Boomer/blob/codex/reviewed-video-lessons/${t.source}`}
              >
                Inspect the implementation ↗
              </a>
            </article>
          ))}
        </div>
      </noscript>
      <p className={s.briefNote}>
        Track names and sponsor judging angles follow the team’s event brief.
        This page demonstrates the implementation; it does not claim an award,
        verified traction or live provider readiness.
      </p>
    </section>
  );
}
