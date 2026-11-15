"use client";
import { useEffect, useRef, useState } from "react";
import s from "./preview.module.css";
import Wordmark from "@/components/pitch/Wordmark";
import { Glyph } from "./Glyphs";
import { StageVisual } from "./Stages";
import System from "./System";
import { AGENTS, FRAMES, PHILLY, PRINCETON, SAFETY_LINE, STAGES, agent, type StageId } from "./data";
import { AnnotKey, Annotations, type Box } from "./Stages";

const M = "/preview/media";

/** Stage copy. Short on purpose: the visual carries the stage; this line names what happened. */
const COPY: Record<StageId, { body: string[]; facts: string; code: string }> = {
  call: {
    body: [
      "The phone rides in a chest harness with the camera page open. The electrician calls Boomer and keeps both hands on the work.",
    ],
    facts: "Wake lock on · stills downscaled on the phone · works over HTTPS on any phone browser",
    code: "app/camera/[workerId] · components/camera/useFrameCapture.ts",
  },
  see: {
    body: ["Every two seconds a fresh frame reaches the job. Boomer only ever judges what the camera shows right now."],
    facts: "Frames attach to the worker's open job; the camera page never needs the job id",
    code: "app/api/frames · lib/db/frames.ts",
  },
  identify: {
    body: [
      "“What am I looking at?” The Guide calls look. Gemini must pick the part from a fixed list and match a job Boomer has checked steps for.",
    ],
    facts: "No fresh frame: it says so and goes by the worker's words",
    code: "lib/ai/identifyJob.ts",
  },
  plan: {
    body: [
      "The step list is data, not a generation. Two hard gates come first. Each step says whether the camera checks it or the worker says it out loud.",
    ],
    facts: "Code editions per town come from official adoption pages, with links",
    code: "lib/ai/buildPlan.ts · data/steps.json · data/towns.json",
  },
  signoff: {
    body: [
      "If the worker has a supervisor on file, the plan goes to them first. Boomer waits for their reply, then reads any note to the worker before step 1.",
    ],
    facts: "“hold off” keeps the job from starting · a texted note can't remove a hard gate",
    code: "lib/jobs/approval.ts · lib/agents/inbox.ts",
  },
  guide: {
    body: [
      "One step, one short line. Breaker off and tester dead are spoken checks that can't be skipped, and a vague answer gets the question again.",
    ],
    facts: "repeat · why · go back · stop all work mid-step · journeymen hear the short version",
    code: "lib/agent/engine.ts · lib/ai/judgeConfirmation.ts",
  },
  check: {
    body: [
      "The worker says “done”. Three reviewers judge the newest frames at once: an inspector, a wiring checker that traces each conductor to its screw, and a photo skeptic that doubts the picture first.",
      "Wires moved to LINE. Only a majority “looks right” moves the job on. A split, a timeout or a blurry frame is “can't tell”, never a pass.",
    ],
    facts: "Each reviewer is capped at 6 s · banned words are scrubbed from model text",
    code: "lib/ai/checkStep.ts · eval/gate.mjs",
  },
  record: {
    body: [
      "Finish the job and it is saved to a record the worker owns: what was seen on camera, what the worker confirmed, and what was corrected. The link arrives by iMessage.",
    ],
    facts: "Records say “Observed by Boomer”, never certified",
    code: "lib/jobs/close.ts · lib/record/buildEntry.ts",
  },
  lesson: {
    body: [
      "A finished session can become a training clip: the mistake, the correction, a freeze frame with boxes on the parts that matter. It stays private until an electrician reviews it and the worker agrees.",
    ],
    facts: "Rendered by FFmpeg on a trusted local worker · captions, chapters and sources",
    code: "lib/lessons/worker.ts · lib/lessons/types.ts",
  },
};

function useHeroSource() {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduce || conn?.saveData) return;
    const portrait = window.matchMedia("(max-aspect-ratio: 4/5)").matches;
    const small = window.innerWidth < 1100;
    setSrc(portrait ? `${M}/field-9x16.mp4` : small ? `${M}/field-16x9-540.mp4` : `${M}/field-16x9.mp4`);
  }, []);
  return src;
}

function Hero() {
  const src = useHeroSource();
  const [failed, setFailed] = useState(false);
  return (
    <header className={s.hero} id="top">
      <div className={s.heroMedia} aria-hidden="true">
        <picture>
          <source media="(max-aspect-ratio: 4/5)" srcSet={`${M}/field-9x16.webp`} />
          <img src={`${M}/field-16x9.webp`} alt="" className={s.heroImg} />
        </picture>
        {src && !failed && (
          <video className={s.heroVideo} src={src} autoPlay muted loop playsInline onError={() => setFailed(true)} />
        )}
        <div className={s.heroScrim} />
      </div>
      <div className={s.viewfinder} aria-hidden="true">
        <i data-c="tl" />
        <i data-c="tr" />
        <i data-c="bl" />
        <i data-c="br" />
      </div>
      <div className={s.heroInner}>
        <h1 className={s.heroTitle}>
          <span>It sees the job.</span>
          <span>It talks you through it.</span>
          <span className={s.heroHot}>It checks every step.</span>
        </h1>
        <p className={s.heroLede}>
          Boomer is a voice and vision partner for electricians. A phone in a chest harness, a guide in your ear, three models
          checking the work, and a record you own.
        </p>
        <div className={s.actions}>
          <a className={s.primary} href="/demo">
            Open the demo console
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </a>
          <a className={s.secondary} href="#story">
            Watch one job, start to finish
          </a>
        </div>
      </div>
      <p className={s.heroCredit}>
        Field footage: Pexels, edited for this page. Not Boomer users. <a href={`${M}/SOURCES.md`}>Sources</a>
      </p>
      <dl className={s.readout} aria-label="System constants from lib/config.ts and lib/ai/checkStep.ts">
        <div>
          <dt>Camera</dt>
          <dd className="num">1 frame / {FRAMES.intervalMs / 1000} s</dd>
        </div>
        <div>
          <dt>On “done”</dt>
          <dd className="num">burst ×{FRAMES.burst}</dd>
        </div>
        <div>
          <dt>Stale after</dt>
          <dd className="num">{FRAMES.maxAgeMs / 1000} s</dd>
        </div>
        <div>
          <dt>Step check</dt>
          <dd className="num">2 of 3 models</dd>
        </div>
        <div className={s.readoutNote}>
          <dt>Source</dt>
          <dd>system constants, not live telemetry</dd>
        </div>
      </dl>
    </header>
  );
}

function Nav() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        setP(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={s.nav} aria-label="Primary">
      <a href="#top" className={s.brand} aria-label="Boomer, back to top">
        <Wordmark />
      </a>
      <ul className={s.navLinks}>
        <li>
          <a href="#field">The field</a>
        </li>
        <li>
          <a href="#story">How it works</a>
        </li>
        <li>
          <a href="#system">System</a>
        </li>
        <li>
          <a href="#agents">Agents</a>
        </li>
        <li>
          <a href="#product">Product</a>
        </li>
      </ul>
      <a className={s.navCta} href="/demo">
        Demo console
      </a>
      <span className={s.progress} style={{ transform: `scaleX(${p})` }} aria-hidden="true" />
    </nav>
  );
}

function Field() {
  const rows: [string, React.ReactNode, React.ReactNode][] = [
    [
      "Adopted code",
      <>
        <b className="num">NEC {PHILLY.necEdition}</b>
        <a href={PHILLY.sourceUrl} target="_blank" rel="noreferrer">
          phila.gov ↗
        </a>
      </>,
      <>
        <b className="num">NEC {PRINCETON.necEdition}</b>
        <a href={PRINCETON.sourceUrl} target="_blank" rel="noreferrer">
          nj.gov ↗
        </a>
      </>,
    ],
    [
      "Permits",
      <a href={PHILLY.permitUrl} target="_blank" rel="noreferrer">
        {PHILLY.permitOffice} ↗
      </a>,
      <a href={PRINCETON.permitUrl} target="_blank" rel="noreferrer">
        {PRINCETON.permitOffice} ↗
      </a>,
    ],
    [
      "License",
      <a href={PHILLY.licenseUrl} target="_blank" rel="noreferrer">
        Philadelphia L&amp;I ↗
      </a>,
      <a href={PRINCETON.licenseUrl} target="_blank" rel="noreferrer">
        NJ Board of Electrical Contractors ↗
      </a>,
    ],
  ];
  return (
    <section className={s.field} id="field" aria-labelledby="field-title">
      <div className={s.fieldPhotos} aria-hidden="true">
        <img src={`${M}/cabinet.webp`} alt="" loading="lazy" />
        <img src={`${M}/battery.webp`} alt="" loading="lazy" />
      </div>
      <div className={s.fieldBody}>
        <h2 id="field-title" className={s.h2}>
          Same two hands.
          <br />A different rulebook at every state line.
        </h2>
        <p className={s.lede}>
          A journeyman from Philadelphia takes a job in Princeton. New code edition, new permit office, new license board, and
          nobody on the call to ask.
        </p>
        <div className={s.compare} role="table" aria-label="Philadelphia and Princeton compared">
          <div role="row" className={s.cmpHead}>
            <span role="columnheader" />
            <span role="columnheader">
              {PHILLY.city}, {PHILLY.state}
              <small>home</small>
            </span>
            <span role="columnheader">
              {PRINCETON.city}, {PRINCETON.state}
              <small>job site</small>
            </span>
          </div>
          {rows.map(([k, a, b]) => (
            <div role="row" key={k} className={s.cmpRow}>
              <span role="rowheader">{k}</span>
              <span role="cell">{a}</span>
              <span role="cell">{b}</span>
            </div>
          ))}
        </div>
        <p className={s.fine}>From data/towns.json, checked against the official pages on Nov 14, 2026. Confirm scope with the local office.</p>
      </div>
    </section>
  );
}

const HANDOFF: Box[] = [
  { x: 0.495, y: 0.353, w: 0.094, h: 0.178, label: "Digital meter", side: "left" },
  { x: 0.512, y: 0.21, w: 0.182, h: 0.085, label: "Indicator lamps" },
  { x: 0.699, y: 0.247, w: 0.046, h: 0.087, label: "Key switch", side: "bottom" },
];

/** Full-bleed break: the jobsite frame turns into the labeled view Boomer works from. */
function Handoff() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={s.handoff} aria-labelledby="handoff-title">
      <div className={s.handoffMedia}>
        <img src={`${M}/panel.webp`} alt="A technician works the digital meter on a control panel with indicator lamps" loading="lazy" />
        <div className={s.handoffAnnot}>
          <Annotations boxes={HANDOFF} on={on} />
        </div>
      </div>
      <div className={s.handoffText}>
        <h2 id="handoff-title" className={s.h2}>
          The jobsite, as Boomer reads it.
        </h2>
        <AnnotKey boxes={HANDOFF} />
        <p className={s.fine}>Pexels · ranjeet. Boxes are illustrative, in the lesson editor’s style, not model output.</p>
      </div>
    </section>
  );
}

function Story() {
  const [active, setActive] = useState<StageId>("call");
  const [beat, setBeat] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mobile = window.matchMedia("(max-width: 899px)").matches;
    const targets = el.querySelectorAll<HTMLElement>(mobile ? "[data-stage]" : "[data-text]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const t = e.target as HTMLElement;
          setActive(t.dataset.stage as StageId);
          setBeat(Number(t.dataset.beat ?? 0));
        }
      },
      { rootMargin: mobile ? "-35% 0px -35% 0px" : "-48% 0px -48% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  const idx = STAGES.findIndex((st) => st.id === active);

  return (
    <section className={s.story} id="story" aria-labelledby="story-title">
      <div className={s.storyIntro}>
        <h2 id="story-title" className={s.h2}>
          One call, start to finish.
        </h2>
        <p className={s.lede}>A GFCI swap on the inert demo prop, followed through the code that runs it.</p>
      </div>

      <div className={s.storyGrid} ref={root}>
        <div className={s.meter} aria-label="Stages">
          <ol>
            {STAGES.map((st, i) => (
              <li key={st.id} className={i === idx ? s.mNow : i < idx ? s.mDone : ""}>
                <a href={`#stage-${st.id}`} aria-current={i === idx ? "step" : undefined}>
                  <span className="num">{st.n}</span>
                  <span className={s.mName}>{st.short}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {STAGES.map((st, i) => (
          <div
            key={`v-${st.id}`}
            className={`${s.visual} ${active === st.id ? s.vActive : ""}`}
            data-stage={st.id}
            data-beat={0}
            style={{ "--mv": 2 * i + 1 } as React.CSSProperties}
          >
            <StageVisual id={st.id} active={active === st.id} beat={active === st.id ? beat : 0} />
          </div>
        ))}

        {STAGES.map((st, i) => {
          const c = COPY[st.id];
          const a = agent(st.agent);
          return (
            <article
              key={`t-${st.id}`}
              id={`stage-${st.id}`}
              className={`${s.text} ${active === st.id ? s.tActive : ""}`}
              style={{ "--row": i + 1, "--mt": 2 * i + 2 } as React.CSSProperties}
            >
              <h3 className={s.h3}>
                <span className={s.visuallyHidden}>Stage {st.n}: </span>
                {st.title}
              </h3>
              {c.body.map((b, j) => (
                <p key={j} className={s.tBody} data-text data-stage={st.id} data-beat={j}>
                  {b}
                </p>
              ))}
              <p className={s.tFacts}>{c.facts}</p>
              <p className={s.tAgent}>
                <Glyph id={st.agent} size={18} />
                <b>{a.name}</b>
                <span>{c.code}</span>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const KIND: Record<string, string> = {
  agent: "Agent",
  model: "Model call",
  rules: "Rules, no model",
  store: "Shared store",
  pipeline: "Pipeline",
};

function Agents() {
  return (
    <section className={s.agents} id="agents" aria-labelledby="agents-title">
      <div className={s.secHead}>
        <h2 id="agents-title" className={s.h2}>
          Who does what.
        </h2>
        <p className={s.lede}>
          Not one chatbot wearing hats. Separate agents on separate channels, model calls with narrow questions, and rules
          wherever a guess would be dangerous.
        </p>
      </div>
      <ol className={s.spec}>
        {AGENTS.map((a) => (
          <li key={a.id} className={s.specRow} data-kind={a.kind}>
            <div className={s.specId}>
              <span className={s.specGlyph}>
                <Glyph id={a.id} size={30} />
              </span>
              <div>
                <h3 className={s.specName}>{a.name}</h3>
                <p className={s.specKind}>{KIND[a.kind]}</p>
              </div>
            </div>
            <p className={s.specRole}>{a.role}</p>
            <dl className={s.specIo}>
              <div>
                <dt>Runs on</dt>
                <dd>{a.runsOn}</dd>
              </div>
              <div>
                <dt>In</dt>
                <dd>{a.receives}</dd>
              </div>
              <div>
                <dt>Out</dt>
                <dd>{a.produces}</dd>
              </div>
            </dl>
            <figure className={s.specSample}>
              <blockquote>{a.sample}</blockquote>
              <figcaption>
                {a.sampleLabel} · <code>{a.code}</code>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Product() {
  return (
    <section className={s.product} id="product" aria-labelledby="product-title">
      <div className={s.secHead}>
        <h2 id="product-title" className={s.h2}>
          The screens, as they run today.
        </h2>
        <p className={s.lede}>
          Captured from this build in mock mode after a scripted call on the demo job. The camera frames are a stock still
          posted to the local job as a stand-in.
        </p>
      </div>
      <div className={s.shots}>
        <figure className={s.shotLaptop}>
          <img src={`${M}/screen-live.webp`} alt="Live job view: Boomer's last line, the camera frame and the step list" loading="lazy" />
          <figcaption>
            <b>Live job view</b> for whoever is watching, read from two meters away · <a href="/job/demo-2041">/job/demo-2041</a>
          </figcaption>
        </figure>
        <figure className={s.shotPhone}>
          <img src={`${M}/screen-record.webp`} alt="Job record on a phone: every step with how it was checked" loading="lazy" />
          <figcaption>
            <b>Job record</b> · <a href="/job/demo-2041/record">/job/demo-2041/record</a>
          </figcaption>
        </figure>
        <figure className={s.shotPhone}>
          <img src={`${M}/screen-camera.webp`} alt="Harness camera setup screen on a phone" loading="lazy" />
          <figcaption>
            <b>Harness camera</b> · <a href="/camera/worker-demo">/camera/worker-demo</a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Gate() {
  return (
    <section className={s.gate} aria-labelledby="gate-title">
      <div className={s.secHead}>
        <h2 id="gate-title" className={s.h2}>
          One mistake the checker is never allowed to make.
        </h2>
        <p className={s.lede}>
          The step check is scored on labeled photos through the same checkStep() the product runs. Saying “looks right” to
          wrong work fails the gate outright.
        </p>
      </div>
      <div className={s.matrix} role="table" aria-label="How each check answer is graded">
        <div role="row" className={s.mxHead}>
          <span role="columnheader" />
          <span role="columnheader">Work is right</span>
          <span role="columnheader">Work is wrong</span>
        </div>
        <div role="row" className={s.mxRow}>
          <span role="rowheader">Boomer says “looks right”</span>
          <span role="cell" className={s.mxOk}>
            <b>Correct</b>
          </span>
          <span role="cell" className={s.mxBad}>
            <b>Dangerous</b>
            <small>any one fails the gate</small>
          </span>
        </div>
        <div role="row" className={s.mxRow}>
          <span role="rowheader">Boomer says “not yet” or “can't tell”</span>
          <span role="cell" className={s.mxMeh}>
            <b>Missed</b>
            <small>worker re-shows it</small>
          </span>
          <span role="cell" className={s.mxOk}>
            <b>Correct</b>
            <small>or cautious</small>
          </span>
        </div>
      </div>
      <p className={s.fine}>
        eval/gate.mjs also fails below 75% correct or when more than 5% of images error. No published accuracy figure is
        claimed here.
      </p>
    </section>
  );
}

function Close() {
  return (
    <section className={s.close} aria-labelledby="close-title">
      <img className={s.closeImg} src={`${M}/hands.webp`} alt="" loading="lazy" aria-hidden="true" />
      <div className={s.closeInner}>
        <h2 id="close-title" className={s.closeTitle}>
          Boomer sees. The electrician decides.
        </h2>
        <p className={s.lede}>{SAFETY_LINE}</p>
        <div className={s.actions}>
          <a className={s.primary} href="/demo">
            Open the demo console
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </a>
          <a className={s.secondary} href="#story">
            Replay the job
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Preview() {
  return (
    <div className={s.root}>
      <a className={s.skip} href="#story">
        Skip to how it works
      </a>
      <Nav />
      <Hero />
      <main className={s.main}>
        <Field />
        <Handoff />
        <Story />
        <section className={s.system} id="system" aria-labelledby="system-title">
          <div className={s.secHead}>
            <h2 id="system-title" className={s.h2}>
              The whole system, on one sheet.
            </h2>
            <p className={s.lede}>
              Agents tap one shared job memory the way loads tap a bus bar. Every line here is a real call or message in the
              code; yellow marks where a person decides.
            </p>
          </div>
          <System />
        </section>
        <Agents />
        <Product />
        <Gate />
        <Close />
      </main>
      <footer className={s.footer}>
        <Wordmark />
        <p>Built at HackPrinceton, Fall 2026 · Andy · Zohaib · Sunny · Aniketh</p>
        <p>
          Design preview. Footage from Pexels under the Pexels License; overlays marked illustrative are not model output.{" "}
          <a href={`${M}/SOURCES.md`}>Sources and licenses</a>
        </p>
      </footer>
    </div>
  );
}
