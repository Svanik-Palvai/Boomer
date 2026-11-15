"use client";
import { useEffect, useRef, useState } from "react";
import s from "./preview.module.css";
import Wordmark from "@/components/pitch/Wordmark";
import { Glyph } from "./Glyphs";
import { StageVisual } from "./Stages";
import System from "./System";
import { AGENTS, FRAMES, PHILLY, PRINCETON, SAFETY_LINE, STAGES, agent, type StageId } from "./data";
import { AnnotKey, Annotations, LoopVideo, StageVideo, type Box } from "./Stages";

const M = "/preview/media";

/** One line per stage. The visual carries the stage; the line only names what happened. */
const COPY: Record<StageId, { title: string; body: string[]; code: string }> = {
  call: { title: "Call in.", body: ["Phone on the chest. Hands stay on the work."], code: "app/camera · useFrameCapture.ts" },
  see: { title: "See.", body: ["A fresh frame every two seconds. Nothing older than ten counts."], code: "app/api/frames · lib/db/frames.ts" },
  identify: { title: "Identify.", body: ["Gemini names the part from a fixed list. No frame, no guess."], code: "lib/ai/identifyJob.ts" },
  plan: { title: "Plan.", body: ["Steps come from checked data, never from the model."], code: "lib/ai/buildPlan.ts · data/steps.json" },
  signoff: { title: "Sign off.", body: ["The supervisor approves by text. Their note is read aloud."], code: "lib/jobs/approval.ts" },
  guide: { title: "Guide.", body: ["One step at a time. Breaker off and tester dead can’t be skipped."], code: "lib/agent/engine.ts · judgeConfirmation.ts" },
  check: {
    title: "Check.",
    body: ["Three models judge the frame. Two of three decide.", "Wires moved to LINE. Only a majority “looks right” moves on."],
    code: "lib/ai/checkStep.ts · eval/gate.mjs",
  },
  record: { title: "Record.", body: ["Every job becomes a record the worker owns, sent by iMessage."], code: "lib/jobs/close.ts" },
  lesson: { title: "Teach.", body: ["Mistakes become lessons, once an electrician reviews them."], code: "lib/lessons/worker.ts" },
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

/** Fires once when the element is mostly on screen. */
function useSeen<T extends HTMLElement>(threshold = 0.45) {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, on] as const;
}

const Arrow = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

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
          <span>Sees the job.</span>
          <span>Talks you through it.</span>
          <span className={s.heroHot}>Checks every step.</span>
        </h1>
        <div className={s.heroFoot}>
          <p className={s.heroLede}>The AI field partner for electricians.</p>
          <div className={s.actions}>
            <a className={s.primary} href="/demo">
              Open the demo console
              <Arrow />
            </a>
          </div>
        </div>
      </div>
      <p className={s.heroCredit}>
        Footage: Pexels, edited. Not Boomer users. <a href={`${M}/SOURCES.md`}>Sources</a>
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

/** The four claims, one at a time: each sentence lights up with the thing it names beside it. */
const BEATS = [
  { line: "A phone on the chest.", cap: "Harness camera · 1 frame / 2 s" },
  { line: "A voice in the ear.", cap: "Guide · spoken line from readStep()" },
  { line: "Three models on every step.", cap: "Check panel · 2 of 3 decide" },
  { line: "A record the worker keeps.", cap: "Work record · link sent by iMessage" },
];

function BeatVisual({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className={s.bPhone}>
        <LoopVideo className={s.bPhoneVideo} src={`${M}/test-meter.mp4`} poster={`${M}/test-meter.webp`} />
        <div className={s.bHud}>
          <span>
            Step <b className="num">2</b>/6
          </span>
          <span>Test it dead and tell me the reading.</span>
        </div>
      </div>
    );
  if (i === 1)
    return (
      <div className={s.bVoice}>
        <div className={s.bWave} aria-hidden="true">
          {Array.from({ length: 28 }, (_, k) => (
            <i key={k} style={{ "--k": k, height: `${18 + ((k * 37) % 70)}%` } as React.CSSProperties} />
          ))}
        </div>
        <p>“Step 2. Test it dead and tell me the reading.”</p>
      </div>
    );
  if (i === 2)
    return (
      <div className={s.bVotes}>
        {["Inspector", "Wiring", "Photo skeptic"].map((r, k) => (
          <p key={r} style={{ "--k": k } as React.CSSProperties}>
            <span>{r}</span>
            <b>Looks right</b>
          </p>
        ))}
        <p className={s.bVerdict}>Looks right.</p>
      </div>
    );
  return (
    <div className={s.bRecord}>
      <p className={s.bRecTitle}>Swap an outlet for a GFCI</p>
      <p className={s.bRecMeta}>Princeton, NJ · 6 of 6 steps</p>
      <span className={s.bTape}>Observed by Boomer</span>
      {["Breaker off", "Tested dead", "Old device out", "LINE and LOAD found", "Wires on LINE", "TEST / RESET"].map((t, k) => (
        <p key={t} className={s.bRow}>
          <i className={k === 0 || k === 1 || k === 5 ? s.bRing : s.bDot} />
          {t}
          {k === 4 && <em>corrected after 1 not yet</em>}
        </p>
      ))}
    </div>
  );
}

/** Scroll-driven: the section is a tall track; text and panel stay pinned while scroll position picks the beat. */
function Statement() {
  const ref = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        const p = travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
        setBeat(Math.min(BEATS.length - 1, Math.floor(p * BEATS.length)));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  const go = (k: number) => {
    const el = ref.current;
    if (!el) return;
    const travel = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + ((k + 0.5) / BEATS.length) * travel;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  };
  return (
    <section ref={ref} className={s.statement} aria-label="What Boomer is">
      <div className={s.statementPin}>
        <p className={s.lines}>
          {BEATS.map((b, k) => (
            <button key={b.line} type="button" className={k === beat ? s.lineOn : ""} aria-pressed={k === beat} onClick={() => go(k)}>
              {b.line}
            </button>
          ))}
        </p>
        <figure className={s.beatPanel} aria-live="polite">
          <div key={beat} className={s.beatStage}>
            <BeatVisual i={beat} />
          </div>
          <i data-c="tl" />
          <i data-c="tr" />
          <i data-c="bl" />
          <i data-c="br" />
          <figcaption>
            <span className={s.povDot} /> {BEATS[beat].cap}
          </figcaption>
          <ol className={s.beatTicks} aria-hidden="true">
            {BEATS.map((b, k) => (
              <li key={b.line} className={k === beat ? s.tickOn : k < beat ? s.tickDone : ""} />
            ))}
          </ol>
        </figure>
      </div>
    </section>
  );
}

/** Electricians the team interviewed (team-reported). Names only: no logo could be verified to the right business. */
const INTERVIEWS = [
  { name: "Loudoun Electrical", where: "VA" },
  { name: "JM Electrical Solutions", where: "Boston" },
  { name: "Dago Electric", where: "VA" },
  { name: "TruVolt Electrical Consulting", where: "NE" },
  { name: "Victory Electrical", where: "MA" },
];

function Interviews() {
  const row = (hidden: boolean) => (
    <ul className={s.marqueeRow} aria-hidden={hidden || undefined}>
      {INTERVIEWS.map((c) => (
        <li key={c.name}>
          <span className={s.coName}>{c.name}</span>
          <span className={s.coWhere}>{c.where}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section className={s.interviews} aria-labelledby="interviews-title">
      <h2 id="interviews-title" className={s.interviewsTitle}>
        Shaped by interviews with working electricians
      </h2>
      <div className={s.marquee}>
        <div className={s.marqueeTrack}>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

function Field() {
  return (
    <section className={s.field} id="field" aria-labelledby="field-title">
      <LoopVideo className={s.fieldImg} src={`${M}/cabinet-loop.mp4`} poster={`${M}/cabinet-loop.webp`} label="A weathered electrical cabinet with tangled wiring" />
      <div className={s.fieldBody}>
        <h2 id="field-title" className={s.h2}>
          New state.
          <br />
          New code.
        </h2>
        <p className={s.edition}>
          <span>
            <small>{PHILLY.city}</small>
            <b className="num">NEC {PHILLY.necEdition}</b>
          </span>
          <Arrow />
          <span className={s.editionHot}>
            <small>{PRINCETON.city}</small>
            <b className="num">NEC {PRINCETON.necEdition}</b>
          </span>
        </p>
        <p className={s.fine}>
          Adopted editions from{" "}
          <a href={PHILLY.sourceUrl} target="_blank" rel="noreferrer">
            phila.gov
          </a>{" "}
          and{" "}
          <a href={PRINCETON.sourceUrl} target="_blank" rel="noreferrer">
            nj.gov
          </a>
.
        </p>
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
  const [ref, on] = useSeen<HTMLElement>();
  return (
    <section ref={ref} className={s.handoff} aria-labelledby="handoff-title">
      <div className={s.handoffMedia}>
        <StageVideo src={`${M}/panel-freeze.mp4`} poster={`${M}/panel-freeze.webp`} active={on} label="A technician works the digital meter on a control panel, then the frame holds" />
        <div className={s.handoffAnnot}>
          <Annotations boxes={HANDOFF} on={on} />
        </div>
      </div>
      <div className={s.handoffText}>
        <h2 id="handoff-title" className={s.h2}>
          It reads the jobsite.
        </h2>
        <AnnotKey boxes={HANDOFF} />
        <p className={s.fine}>Boxes are illustrative, not model output.</p>
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
          One call, nine steps.
        </h2>
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
                <span className={s.stageNum} aria-hidden="true">
                  {st.n}
                </span>
                <span className={s.visuallyHidden}>Stage {st.n}: </span>
                {c.title}
              </h3>
              {c.body.map((b, j) => (
                <p key={j} className={s.tBody} data-text data-stage={st.id} data-beat={j}>
                  {b}
                </p>
              ))}
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
  rules: "Rules · no model",
  store: "Shared store",
  pipeline: "Pipeline",
};

/** Agents as a tile wall: one mark, one name, one line each. */
function Agents() {
  return (
    <section className={s.agents} id="agents" aria-labelledby="agents-title">
      <div className={s.secHead}>
        <h2 id="agents-title" className={s.h2}>
          Not one chatbot. A crew.
        </h2>
      </div>
      <ul className={s.tiles}>
        {AGENTS.map((a) => (
          <li key={a.id} className={s.tile} data-kind={a.kind}>
            <span className={s.tileKind}>{KIND[a.kind]}</span>
            <Glyph id={a.id} size={56} className={s.tileGlyph} />
            <h3 className={s.tileName}>{a.name}</h3>
            <p className={s.tileRole}>{a.short}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Product() {
  return (
    <section className={s.product} id="product" aria-labelledby="product-title">
      <div className={s.secHead}>
        <h2 id="product-title" className={s.h2}>
          The real screens.
        </h2>
      </div>
      <div className={s.shots}>
        <figure className={s.shotLaptop}>
          <img src={`${M}/screen-live.webp`} alt="Live job view: Boomer's last line, the camera frame and the step list" loading="lazy" />
          <figcaption>
            <b>Live job view</b> <a href="/job/demo-2041">/job/demo-2041</a>
          </figcaption>
        </figure>
        <figure className={s.shotPhone}>
          <img src={`${M}/screen-record.webp`} alt="Job record on a phone: every step with how it was checked" loading="lazy" />
          <figcaption>
            <b>Job record</b> <a href="/job/demo-2041/record">/record</a>
          </figcaption>
        </figure>
        <figure className={s.shotPhone}>
          <img src={`${M}/screen-camera.webp`} alt="Harness camera setup screen on a phone" loading="lazy" />
          <figcaption>
            <b>Harness camera</b> <a href="/camera/worker-demo">/camera</a>
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
          Never a false “looks right.”
        </h2>
      </div>
      <div className={s.matrix} role="table" aria-label="How each check answer is graded">
        <div role="row" className={s.mxHead}>
          <span role="columnheader">
            <span className={s.visuallyHidden}>Boomer’s answer</span>
          </span>
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
          </span>
          <span role="cell" className={s.mxOk}>
            <b>Correct</b>
          </span>
        </div>
      </div>
      <p className={s.fine}>
        Scored by eval/gate.mjs on labeled photos. No accuracy figure is claimed.
      </p>
    </section>
  );
}

function Close() {
  return (
    <section className={s.close} aria-labelledby="close-title">
      <LoopVideo className={s.closeImg} src={`${M}/hands-loop.mp4`} poster={`${M}/hands-loop.webp`} />
      <div className={s.closeInner}>
        <h2 id="close-title" className={s.closeTitle}>
          Boomer sees.
          <br />
          The electrician decides.
        </h2>
        <p className={s.lede}>{SAFETY_LINE}</p>
        <div className={s.actions}>
          <a className={s.primary} href="/demo">
            Open the demo console
            <Arrow />
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
        <Statement />
        <Interviews />
        <Field />
        <Handoff />
        <Story />
        <section className={s.system} id="system" aria-labelledby="system-title">
          <div className={s.secHead}>
            <h2 id="system-title" className={s.h2}>
              One shared memory.
            </h2>
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
        <p>HackPrinceton Fall 2026 · Andy · Zohaib · Sunny · Aniketh</p>
        <p>
          Design preview · footage: Pexels · <a href={`${M}/SOURCES.md`}>sources</a>
        </p>
      </footer>
    </div>
  );
}
