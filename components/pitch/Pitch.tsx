"use client";
// OWNER: Pitch presentation. Example-only UI: no camera, call, job mutations or provider requests.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { companies, guideBeats, replayBeats, sections } from "./content";
import CompanyMark from "./CompanyMark";
import Wordmark from "./Wordmark";
import AgentSystem from "./AgentSystem";
import JudgeTracks from "./JudgeTracks";
import LessonShowcase from "./LessonShowcase";
import { OpeningScene, BorderScene, RecordScene } from "./ScrollScenes";
import { Harness, Outlet } from "./Illustrations";
import s from "./pitch.module.css";

export default function Pitch() {
  const root = useRef<HTMLDivElement>(null);
  const replay = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string>("problem");
  const [guide, setGuide] = useState(0);
  const [beat, setBeat] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualReplay, setManualReplay] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const frame = replayBeats[beat];
  useEffect(() => {
    setEnhanced(true);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      root.current?.style.setProperty(
        "--progress",
        String(max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0),
      );
      if (
        !manualReplay &&
        !reduced.matches &&
        innerWidth >= 900 &&
        innerHeight >= 620 &&
        replay.current
      ) {
        const rect = replay.current.getBoundingClientRect();
        const progress = Math.min(
          0.999,
          Math.max(0, -rect.top / Math.max(1, rect.height - innerHeight)),
        );
        setBeat(Math.floor(progress * replayBeats.length));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            if (entry.target.hasAttribute("data-guide"))
              setGuide(Number(entry.target.getAttribute("data-guide")));
            else setActive(entry.target.id);
          }
      },
      { rootMargin: "-20% 0px -45% 0px", threshold: 0 },
    );
    root.current
      ?.querySelectorAll("[data-section], [data-guide]")
      .forEach((el) => observer.observe(el));
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    reduced.addEventListener("change", schedule);
    update();
    return () => {
      observer.disconnect();
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      reduced.removeEventListener("change", schedule);
      cancelAnimationFrame(raf);
    };
  }, [manualReplay]);
  function move(index: number) {
    setManualReplay(true);
    setBeat(Math.max(0, Math.min(replayBeats.length - 1, index)));
  }
  return (
    <div ref={root} className={s.pitch} data-enhanced={enhanced}>
      <a className={s.skip} href="#problem">
        Skip to the story
      </a>
      <header className={s.nav}>
        <a
          className={s.brand}
          href="#problem"
          aria-label="Boomer, back to the beginning"
        >
          <Wordmark />
          <span aria-hidden="true">↗</span>
        </a>
        <nav aria-label="Pitch sections">
          {sections.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <Link className={s.navDemo} href="/demo">
          LIVE DEMO ↗
        </Link>
        <div className={s.progress} aria-hidden="true" />
      </header>
      <main className={s.main}>
        <OpeningScene />
        <BorderScene />

        <section className={s.industry} aria-labelledby="industry-title">
          <div className={s.railHeading}>
            <div>
              <h2 id="industry-title">The industry we’re building for.</h2>
            </div>
            <button onClick={() => setPaused(!paused)} aria-pressed={paused}>
              {paused ? "Resume motion →" : "Pause motion Ⅱ"}
            </button>
          </div>
          <div className={s.railViewport}>
            <div className={s.rail} data-paused={paused}>
              {[0, 1].map((copy) => (
                <div
                  className={s.railGroup}
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {companies.map((company) => (
                    <div key={company.name} className={s.companyWrap}>
                      <CompanyMark company={company} duplicate={copy === 1} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how"
          data-snap
          className={`${s.section} ${s.dark} ${s.setupSection}`}
        >
          <div className={s.sectionLabel}>
            <span>02 / THE SETUP</span>
            <span>PHOTON NUMBER → ELEVENLABS VOICE AGENT</span>
          </div>
          <h2>
            Strap in. Call Boomer.
            <br />
            <span className={s.yellowText}>Get to work.</span>
          </h2>
          <div className={s.guideLayout}>
            <div className={s.guideVisual} data-guide-phase={guide}>
              <span className={s.kicker}>FIELD SETUP / ILLUSTRATION</span>
              <Harness beat={guide} />
              <div className={s.voice}>
                <span className={s.kicker}>BOOMER VOICE AGENT / EXAMPLE</span>
                <p>“{guideBeats[guide].say}”</p>
                <div className={s.signal} aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <i key={i} style={{ height: `${8 + ((i * 17) % 27)}px` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className={s.guideCopy}>
              {guideBeats.map((b, i) => (
                <article
                  key={b.label}
                  data-guide={i}
                  className={s.guideBeat}
                  data-active={guide === i}
                >
                  <span className={s.kicker}>{b.label}</span>
                  <h3>{b.title}</h3>
                  <p>{b.copy}</p>
                  <span className={s.technical}>{b.detail}</span>
                  <blockquote className={s.mobileQuote}>“{b.say}”</blockquote>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={replay}
          id="correction"
          data-section
          className={s.replaySection}
        >
          <div className={s.replaySticky}>
            <div className={s.sectionLabel}>
              <span>03 / THE MOMENT IT CLICKS</span>
              <span>EXAMPLE REPLAY</span>
            </div>
            <div className={s.replayLayout}>
              <div className={s.replayText}>
                <h2>
                  A second look.
                  <br />
                  <span className={s.yellowText}>A better next step.</span>
                </h2>
                <p className={s.demoLabel}>
                  Example replay · inert prop · simulated electrical tests
                </p>
                <div
                  className={s.replayCaption}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className={s.kicker}>
                    0{beat + 1} / {frame.label}
                  </span>
                  <h3>{frame.title}</h3>
                  <span className={s.speaker}>{frame.speaker}</span>
                  <p className={s.spoken}>“{frame.say}”</p>
                  <p className={s.replayNote}>{frame.note}</p>
                </div>
                <div className={s.replayControls}>
                  <button
                    onClick={() => move(beat - 1)}
                    disabled={beat === 0}
                    aria-label="Previous replay step"
                  >
                    ← Back
                  </button>
                  <span>
                    {beat + 1} / {replayBeats.length}
                  </span>
                  <button
                    onClick={() => move(beat + 1)}
                    disabled={beat === replayBeats.length - 1}
                    aria-label="Next replay step"
                  >
                    Next →
                  </button>
                  <button onClick={() => move(0)}>↺ Replay</button>
                </div>
                <p className={s.controlNote}>
                  {manualReplay
                    ? "Manual replay. Use Back, Next or Replay."
                    : "Scroll through the example, or use the controls."}
                </p>
              </div>
              <div className={s.replayDiagram}>
                <div className={s.diagramHeader}>
                  <span>CAMERA VIEW / SCHEMATIC</span>
                  <span>UNPOWERED</span>
                </div>
                <Outlet connected={frame.connected} correct={frame.correct} />
                <div className={s.diagramStatus} data-correct={frame.correct}>
                  {!frame.connected
                    ? "WAITING FOR THE WORKER"
                    : frame.correct
                      ? "LOOKS RIGHT · VISIBLE OBSERVATION"
                      : beat === 2
                        ? "NOT YET · LOAD ≠ LINE"
                        : "WORKER: ‘DONE’"}
                </div>
              </div>
            </div>
            <p className={s.safety}>
              Boomer guides and checks what the camera can see; the electrician
              tests, decides and stays responsible.
            </p>
            {!enhanced && (
              <ol className={s.staticReplay}>
                {replayBeats.map((b) => (
                  <li key={b.label}>
                    <b>{b.label}</b>
                    <p>{b.say}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <RecordScene />

        <section
          id="lessons"
          data-section
          className={`${s.section} ${s.paper} ${s.lessonSection}`}
          aria-labelledby="lessons-title"
        >
          <div>
            <span className={s.kicker}>05 / KNOWLEDGE THAT KEEPS WORKING</span>
            <h2 id="lessons-title">
              Record the job.
              <br />
              Build a lesson.
              <br />
              Share the knowledge.
            </h2>
            <p>
              Give the next electrician more than a transcript. The pipeline
              assembles consented footage and call audio into an editable lesson
              draft—with chapters, captions, corrections and labeled freeze
              frames.
            </p>
            <Link href="/lessons" className={s.textLink}>
              Explore the lesson library ↗
            </Link>
          </div>
          <div>
            <ol className={s.lessonFlow}>
              {[
                "Capture with consent",
                "Generate a draft from real evidence",
                "Edit captions, sync & annotations",
                "Render with FFmpeg",
                "Electrician review + worker permission",
                "Publish the reviewed version",
              ].map((step, i) => (
                <li key={step}>
                  <span>0{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <details className={s.pipelineTech}>
              <summary>Inside the lesson pipeline ↗</summary>
              <p>
                Private direct uploads and retained recording chunks feed a
                durable preparation/render queue. An explicit laptop FFmpeg
                worker exports H.264/AAC video, captions and a poster with
                labeled freeze-frame annotations.
              </p>
              <p>
                Revision checks, task leases and retry paths protect the render.
                Every edit invalidates the prior render and approvals; only the
                reviewed, worker-permitted revision can be published.
              </p>
              <a
                href="https://github.com/Svanik-Palvai/Boomer/pull/6/files"
                target="_blank"
                rel="noreferrer"
              >
                Inspect the pipeline implementation ↗
              </a>
            </details>
            <p className={s.pipelineNote}>
              A real session must complete editing, rendering, electrician
              review and worker permission before its lesson is published.
            </p>
          </div>
        </section>

        <LessonShowcase />
        <AgentSystem />
        <details id="tracks" className={s.trackDisclosure}>
          <summary>Sponsor tracks · inspect the technical evidence ↗</summary>
          <JudgeTracks />
        </details>

        <section id="build" data-section className={`${s.section} ${s.dark}`}>
          <div className={s.sectionLabel}>
            <span>08 / UNDER THE HOOD</span>
            <span>ONE JOB CONNECTS THE SYSTEM</span>
          </div>
          <div className={s.split}>
            <h2>
              Real tools.
              <br />
              <span className={s.yellowText}>One field workflow.</span>
            </h2>
            <p className={s.lede}>
              Voice and vision meet in the backend. The electrician stays in
              control.
            </p>
          </div>
          <div className={s.architecture}>
            <div>
              <span className={s.kicker}>ON SITE</span>
              <h3>Harness camera</h3>
              <p>Recent still frames</p>
            </div>
            <span className={s.connector} aria-hidden="true">
              →
            </span>
            <div className={s.backend}>
              <span className={s.kicker}>SHARED JOB / BACKEND</span>
              <h3>See. Guide. Remember.</h3>
              <p>
                Gemini visual checks · reviewed steps
                <br />
                Jurisdiction sources · job memory
              </p>
            </div>
            <span className={s.connector} aria-hidden="true">
              ←
            </span>
            <div>
              <span className={s.kicker}>ON THE CALL</span>
              <h3>Photon voice + ElevenLabs agent</h3>
              <p>SIP call → agent → server tools</p>
            </div>
          </div>
          <div className={s.architectureBottom}>
            JOB COMPLETE <span aria-hidden="true">↓</span> WORK RECORD + PHOTON
            IMESSAGE
          </div>
          <div className={s.lessonArchitecture}>
            CONSENTED VIDEO + CALL AUDIO + TRANSCRIPT → PRIVATE EDIT PROPOSAL →
            LAPTOP FFMPEG RENDER → REVIEW & PERMISSION → PUBLISHED LESSON
          </div>
          <details className={s.buildNotes}>
            <summary>What’s real, preloaded, and still being verified</summary>
            <p>
              This page is a self-contained illustration, not a live session.
              The product integrates camera capture, voice tools, Gemini checks,
              jurisdiction lookup and job records. The demo step template and
              two-jurisdiction references are preloaded. Live provider
              configuration, physical-device checks and the real
              recording/review acceptance remain deployment and rehearsal
              dependencies.
            </p>
            <p>
              Camera frames and a voice call travel separately; this is not
              continuous video streaming. The demo uses an inert prop and
              simulated electrical tests.
            </p>
          </details>
          <div className={s.final}>
            <span className={s.kicker}>BUILT AT HACKPRINCETON / FALL 2026</span>
            <h2>
              Built for the work.
              <br />
              <span className={s.yellowText}>Ready for a closer look?</span>
            </h2>
            <div className={s.finalActions}>
              <Link href="/demo" className={s.cta}>
                Open live demo <span aria-hidden="true">↗</span>
              </Link>
              <a
                href="https://github.com/Svanik-Palvai/Boomer"
                target="_blank"
                rel="noreferrer"
                className={s.textLink}
              >
                Read the code ↗
              </a>
            </div>
            <p className={s.finalNote}>
              Demo setup opens the real product screens. A live call requires
              the team’s configured phone and providers.
            </p>
          </div>
          <div className={s.team}>
            {["Andy", "Zohaib", "Sunny", "Aniketh"].map((name) => (
              <b key={name}>{name}</b>
            ))}
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <a href="#problem">
          <Wordmark /> ↗
        </a>
        <p>
          Local knowledge. Hands-free guidance.
          <br />A work record that travels with you.
        </p>
        <span>
          HACKPRINCETON 2026
          <br />
          STARTING WITH ELECTRICIANS
        </span>
      </footer>
    </div>
  );
}
