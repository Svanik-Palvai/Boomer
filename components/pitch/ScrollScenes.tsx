"use client";
// OWNER: Pitch presentation. Scroll-scrubbed illustrations; no product APIs or shared state.
import { useEffect, useRef, useState, type RefObject } from "react";
import { jurisdictions } from "./content";
import s from "./scenes.module.css";

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const segment = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const ease = (p: number) => p * p * (3 - 2 * p);

/** DOM-only interpolation keeps animation independent of React render frequency. */
function useScene(kind: "intro" | "border" | "record") {
  const ref = useRef<HTMLElement>(null);
  const [motion, setMotion] = useState(false);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const media = matchMedia(
      "(min-width: 760px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0;
    let lastPhase = -1;
    const draw = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const navHeight =
        document.querySelector("header")?.getBoundingClientRect().height ?? 76;
      const p = media.matches
        ? clamp(
            (navHeight - rect.top) /
              Math.max(1, rect.height - innerHeight + navHeight),
          )
        : 1;
      const put = (key: string, n: number) =>
        el.style.setProperty(key, String(n));
      put("--p", p);
      if (kind === "intro") {
        const title = ease(segment(p, 0.08, 0.28));
        const gather = ease(segment(p, 0.1, 0.38));
        put("--title-out", title);
        put("--gather", gather);
        put("--hub", ease(segment(p, 0.3, 0.43)));
        put("--left", ease(segment(p, 0.44, 0.57)));
        put("--middle", ease(segment(p, 0.58, 0.71)));
        put("--right", ease(segment(p, 0.72, 0.85)));
      }
      if (kind === "border") {
        put("--travel", ease(segment(p, 0.08, 0.62)));
        put("--local", ease(segment(p, 0.48, 0.8)));
      }
      if (kind === "record") {
        put("--message", ease(segment(p, 0.08, 0.35)));
        put("--record", ease(segment(p, 0.35, 0.75)));
      }
      const next =
        kind === "intro"
          ? p < 0.28
            ? 0
            : p < 0.48
              ? 1
              : p < 0.62
                ? 2
                : p < 0.77
                  ? 3
                  : 4
          : p < 0.3
            ? 0
            : p < 0.65
              ? 1
              : 2;
      if (next !== lastPhase) {
        lastPhase = next;
        setPhase(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const configure = () => {
      setMotion(media.matches);
      schedule();
    };
    media.addEventListener("change", configure);
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    configure();
    return () => {
      media.removeEventListener("change", configure);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [kind]);
  return { ref: ref as RefObject<HTMLElement>, motion, phase };
}

const friction = [
  ["01 / LOCAL CODE", "A different edition.", "Which rules apply here?"],
  ["02 / LICENSE", "Another state line.", "What does my credential cover?"],
  ["03 / PERMIT OFFICE", "Another phone call.", "Who can confirm the scope?"],
  ["04 / THE JOB", "Hands full. Eyes down.", "No time to hunt through tabs."],
  ["05 / EXPERIENCE", "Years on the tools.", "A record that doesn’t follow."],
  [
    "06 / NEXT EMPLOYER",
    "Start explaining again.",
    "Show the work you’ve done.",
  ],
];
const capabilities = [
  ["01", "Know the place.", "Local references, in the job."],
  ["02", "Do the work.", "A guide that sees what you see."],
  ["03", "Take it with you.", "A record owned by the worker."],
];
const introCaptions = [
  ["", ""],
  [
    "One worker. One place to start.",
    "Local knowledge. Hands-free guidance. A work record that travels.",
  ],
  [
    "Your next job shouldn’t mean starting over.",
    "Bring the jurisdiction’s sources into the same conversation.",
  ],
  [
    "Hands on the tools. Boomer on the call.",
    "Look, guide, check—and explain a visible correction.",
  ],
  [
    "The job ends. Your experience stays.",
    "Keep the observations and corrections in a portable work record.",
  ],
];
export function OpeningScene() {
  const { ref, motion, phase } = useScene("intro");
  return (
    <section
      ref={ref}
      id="problem"
      data-section
      data-motion={motion}
      data-phase={phase}
      className={`${s.scene} ${s.intro}`}
      aria-label="The Boomer story"
    >
      <div className={s.stage}>
        <div className={s.stageMeta}>
          <span>HACKPRINCETON / 2026</span>
          <span>BUILT FOR THE PEOPLE WHO BUILD EVERYTHING</span>
        </div>
        <div className={s.introTitle}>
          <p>AI is moving other industries at lightspeed.</p>
          <div className={s.wordmark} aria-hidden="true">
            BOOMER<span>↗</span>
          </div>
          <h1>
            Who’s building for the people
            <br />
            who build everything?
          </h1>
          <p className={s.positioning}>
            The operating system for blue-collar work. Voice agents. Local
            context.
          </p>
        </div>
        <div className={s.chaos} aria-hidden="true">
          {friction.map(([tag, title, detail], i) => (
            <div className={`${s.fragment} ${s[`fragment${i}`]}`} key={tag}>
              <span>{tag}</span>
              <b>{title}</b>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className={s.system} aria-hidden="true">
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            className={s.wires}
          >
            <path
              className={s.leftWire}
              pathLength="1000"
              d="M500 210 C500 295 180 270 180 385"
            />
            <path
              className={s.middleWire}
              pathLength="1000"
              d="M500 210 V385"
            />
            <path
              className={s.rightWire}
              pathLength="1000"
              d="M500 210 C500 295 820 270 820 385"
            />
          </svg>
          <div className={s.hub}>
            <span>BOOMER ↗</span>
            <div className={s.hubSymbol}>
              B<span>↗</span>
            </div>
            <small>WORKER FIRST.</small>
          </div>
          <div className={s.branches}>
            {capabilities.map(([n, title, copy], i) => (
              <div key={n} className={s.branch} data-index={i}>
                <span>{n}</span>
                <b>{title}</b>
                <small>{copy}</small>
              </div>
            ))}
          </div>
        </div>
        <div className={s.caption} aria-live="off">
          {phase > 0 && <h2>{introCaptions[phase][0]}</h2>}
          <p>{introCaptions[phase][1]}</p>
        </div>
        <div className={s.scrollNote}>
          <span>STARTING WITH ELECTRICIANS.</span>
          <span>
            {!motion
              ? "LOCAL KNOWLEDGE. WORK THAT TRAVELS."
              : phase === 0
                ? "SCROLL TO BRING IT TOGETHER ↓"
                : `THE STORY / 0${phase} OF 04`}
          </span>
        </div>
      </div>
      <div className={s.staticCapabilities}>
        {capabilities.map(([n, title, copy]) => (
          <div key={n}>
            <span>{n}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BorderScene() {
  const { ref, motion, phase } = useScene("border");
  const { home, destination: dest } = jurisdictions;
  return (
    <section
      ref={ref}
      id="borders"
      data-section
      data-motion={motion}
      data-phase={phase}
      className={`${s.scene} ${s.border}`}
    >
      <div className={s.stage}>
        <div className={s.stageMeta}>
          <span>01 / THE STATE-LINE PROBLEM</span>
          <span>ILLUSTRATED JOURNEY / PA → NJ</span>
        </div>
        <div className={s.borderHeading}>
          <h2>
            Your skills travel.
            <br />
            <em>The information doesn’t.</em>
          </h2>
          <p>A new job shouldn’t send you back to square one.</p>
        </div>
        <div className={s.routeVisual} aria-hidden="true">
          <svg
            viewBox="0 0 1000 150"
            preserveAspectRatio="none"
            className={s.routeLine}
          >
            <path d="M130 75 H870" />
            <path className={s.routeFill} pathLength="1000" d="M130 75 H870" />
          </svg>
          <div className={s.originCard}>
            <span>HOME / PENNSYLVANIA</span>
            <b>{home.city}</b>
            <small>{home.necEdition} NEC</small>
          </div>
          <div className={s.destinationCard}>
            <span>JOB / NEW JERSEY</span>
            <b>{dest.city}</b>
            <small>{dest.necEdition} NEC</small>
          </div>
          <div className={s.traveler}>
            B<span>↗</span>
            <small>YOUR EXPERIENCE</small>
          </div>
          <div className={s.localNote}>
            <span>LOCATION CONFIRMED</span>
            <b>Princeton, NJ</b>
            <small>Local sources attached to the job.</small>
          </div>
        </div>
        <div className={s.borderCaption}>
          <span>
            0{phase + 1} /{" "}
            {["LEAVE HOME", "CROSS THE LINE", "GET THE LOCAL CONTEXT"][phase]}
          </span>
          <h3>
            {
              [
                "Your experience comes with you.",
                "The questions change with the place.",
                "Keep the local knowledge within reach.",
              ][phase]
            }
          </h3>
          <p>
            {
              [
                "Licensing, code references and past work shouldn’t live in disconnected places.",
                "Which edition? Which permit office? What does your credential cover?",
                "Source-backed references. Worker-confirmed location. No invented regional requirements.",
              ][phase]
            }
          </p>
        </div>
        <details className={s.sources}>
          <summary>Sources & scope ↗</summary>
          <div>
            <p>
              <a href={home.sourceUrl} target="_blank" rel="noreferrer">
                Philadelphia: {home.necEdition} NEC ↗
              </a>{" "}
              ·{" "}
              <a href={dest.sourceUrl} target="_blank" rel="noreferrer">
                New Jersey: {dest.necEdition} NEC ↗
              </a>
            </p>
            <p>
              {dest.editionCaveat} The countertop GFCI demo does not establish a
              Philadelphia-to-Princeton installation difference.
            </p>
            <p>
              {dest.licenseNote}{" "}
              <a href={dest.licenseUrl} target="_blank" rel="noreferrer">
                Licensing source ↗
              </a>
            </p>
          </div>
        </details>
      </div>
    </section>
  );
}

export function RecordScene() {
  const { ref, motion, phase } = useScene("record");
  return (
    <section
      ref={ref}
      id="record"
      data-section
      data-motion={motion}
      data-phase={phase}
      className={`${s.scene} ${s.record}`}
    >
      <div className={s.stage}>
        <div className={s.stageMeta}>
          <span>04 / WHAT FOLLOWS YOU</span>
          <span>EXAMPLE RECORD / ILLUSTRATED DATA</span>
        </div>
        <div className={s.recordCopy}>
          <span className={s.micro}>THE WORKER OWNS THE RECORD</span>
          <h2>
            New job.
            <br />
            New state.
            <br />
            <em>Same track record.</em>
          </h2>
          <p>
            {
              [
                "The job ends. Your experience doesn’t disappear with it.",
                "A record lands where you already are: your messages.",
                "Share the observations, corrections and sources with the next employer.",
              ][phase]
            }
          </p>
          <span className={s.recordStamp}>OBSERVED BY BOOMER ↗</span>
        </div>
        <div className={s.recordObjects}>
          <div className={s.messagePhone}>
            <div className={s.phoneNotch} />
            <span>PHOTON IMESSAGE / EXAMPLE</span>
            <b>BOOMER</b>
            <div className={s.message}>
              Your GFCI demo job in Princeton is saved.
              <br />
              <br />
              Here’s the work record you can take to your next job.
              <small>boomer / job / example ↗</small>
            </div>
            <small>EXAMPLE · NOT A SENT MESSAGE</small>
          </div>
          <div className={s.jobPaper}>
            <div className={s.paperHeading}>
              <span>WORK RECORD / EXAMPLE</span>
              <b>01</b>
            </div>
            <h3>
              Kitchen GFCI
              <br />
              Princeton, NJ
            </h3>
            <div className={s.result}>
              <span>Breaker off</span>
              <b>Worker confirmed</b>
            </div>
            <div className={s.result}>
              <span>Circuit test</span>
              <b>Spoken / simulated</b>
            </div>
            <div className={s.result}>
              <span>LINE connection</span>
              <b>Corrected · seen</b>
            </div>
            <p>A camera observation is not an electrical test or a license.</p>
            <span className={s.micro}>OBSERVED BY BOOMER</span>
          </div>
        </div>
        <div className={s.recordFooter}>
          PHOTOS + STEP HISTORY + REGIONAL REFERENCES{" "}
          <span aria-hidden="true">→</span> A RECORD THAT TRAVELS.
        </div>
      </div>
    </section>
  );
}
