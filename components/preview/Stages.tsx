"use client";
// The nine scroll-stage visuals. Each takes `active` (and `beat` for two-beat stages) and plays its own
// sequence with CSS transitions; reduced motion shows the final state. Nothing here calls a product API.
import { useEffect, useRef, useState } from "react";
import s from "./stages.module.css";
import { Glyph } from "./Glyphs";
import { FRAMES, PHILLY, PRINCETON, STEPS, type StageId } from "./data";

const M = "/preview/media";

// ───────────────────────── shared pieces ─────────────────────────

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  side?: "top" | "bottom" | "left" | "inside";
  align?: "right";
}

/** Lesson-editor style annotation layer over a 16:9 freeze frame. Coordinates are 0–1 of the frame. */
export function Annotations({ boxes, on }: { boxes: Box[]; on: boolean }) {
  return (
    <div className={`${s.annot} ${on ? s.on : ""}`}>
      {boxes.map((b, i) => (
        <div
          key={b.label}
          className={s.box}
          style={
            {
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
              "--i": i,
            } as React.CSSProperties
          }
        >
          <span className={s.boxNum}>{i + 1}</span>
          <span className={`${s.boxLabel} ${b.side === "bottom" ? s.below : b.side === "left" ? s.left : b.side === "inside" ? s.inside : ""} ${(b.align === "right" || b.x + b.w > 0.8) && b.side !== "left" && b.side !== "inside" ? s.alignR : ""}`}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Phone-only key for numbered boxes (labels don't fit inside a narrow frame). */
export function AnnotKey({ boxes }: { boxes: Box[] }) {
  return (
    <ol className={s.annotKey}>
      {boxes.map((b) => (
        <li key={b.label}>{b.label}</li>
      ))}
    </ol>
  );
}

/** A muted loop that only plays while its stage is active and on screen. */
export function StageVideo({ src, poster, active, label }: { src: string; poster: string; active: boolean; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (active && seen && !reduce) {
      if (v.preload !== "auto") v.preload = "auto";
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active, seen]);
  return (
    <video
      ref={ref}
      className={s.video}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="none"
      aria-label={label}
      onEnded={(e) => {
        // Hold on the freeze frame; the annotation layer is drawn over it.
        e.currentTarget.pause();
      }}
    />
  );
}

function Frame({ children, caption, note, boxes }: { children: React.ReactNode; caption?: React.ReactNode; note?: string; boxes?: Box[] }) {
  return (
    <figure className={s.frame}>
      <div className={s.media}>
        {children}
        <i className={s.corner} data-c="tl" />
        <i className={s.corner} data-c="tr" />
        <i className={s.corner} data-c="bl" />
        <i className={s.corner} data-c="br" />
      </div>
      {(caption || note) && (
        <figcaption className={s.cap}>
          {boxes && (
            <ol className={s.annotKey}>
              {boxes.map((b) => (
                <li key={b.label}>{b.label}</li>
              ))}
            </ol>
          )}
          {note && <span className={s.capNote}>{note}</span>}
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ───────────────────────── 01 call ─────────────────────────

function CallVisual({ active }: { active: boolean }) {
  const step = STEPS[1];
  return (
    <div className={s.call}>
      <div className={s.phone} aria-label="Illustration of the harness camera page on a phone">
        <StageVideo src={`${M}/field-9x16.mp4`} poster={`${M}/field-9x16.webp`} active={active} label="Portrait field footage inside the phone" />
        <div className={s.hud}>
          <p className={s.hudStep}>
            <span>Step</span>
            <b className="num">2</b>
            <span className={s.hudOf}>/6</span>
          </p>
          <p className={s.hudText}>{step.short}</p>
          <p className={s.hudSignal}>
            <i /> Connected · frame 1 s old
          </p>
        </div>
        <div className={s.hudFoot}>
          <span className="num">Frames sent 148</span>
          <span>Screen awake</span>
        </div>
      </div>
      <dl className={s.callFacts}>
        <div>
          <dt>Frame interval</dt>
          <dd className="num">{FRAMES.intervalMs / 1000} s, while the call runs</dd>
        </div>
        <div>
          <dt>On “done”</dt>
          <dd className="num">burst of {FRAMES.burst} stills</dd>
        </div>
        <div>
          <dt>Image size</dt>
          <dd className="num">{FRAMES.maxEdgePx} px long edge, downscaled on the phone</dd>
        </div>
        <div>
          <dt>Taps mid-job</dt>
          <dd>none; after Start everything is by voice</dd>
        </div>
      </dl>
    </div>
  );
}

// ───────────────────────── 02 see ─────────────────────────

const WALL: Box[] = [
  { x: 0.506, y: 0.2, w: 0.11, h: 0.245, label: "Device box" },
  { x: 0.825, y: 0.195, w: 0.078, h: 0.217, label: "Device box 2", side: "left" },
  { x: 0.75, y: 0.44, w: 0.144, h: 0.5, label: "Cable run", side: "inside" },
  { x: 0.145, y: 0.16, w: 0.35, h: 0.58, label: "Hard hat" },
];

function SeeVisual({ active }: { active: boolean }) {
  const ages = [0, 2, 4, 6, 8, 10, 12];
  return (
    <div className={s.stack}>
      <Frame
        boxes={WALL}
        note="Boxes: illustrative annotation in the lesson editor's style, placed by hand, not model output"
        caption={
          <>
            <span>Over-the-shoulder view of an open wall</span>
            <span>Pexels · Kindel Media</span>
          </>
        }
      >
        <StageVideo src={`${M}/see-wall.mp4`} poster={`${M}/see-wall.webp`} active={active} label="Electrician in a hard hat looking at an open wall with device boxes" />
        <Annotations boxes={WALL} on={active} />
      </Frame>
      <div className={s.strip} aria-label={`Frames older than ${FRAMES.maxAgeMs / 1000} seconds are never used for a check`}>
        {ages.map((a, i) => (
          <div key={a} className={`${s.thumb} ${a > FRAMES.maxAgeMs / 1000 ? s.stale : ""}`}>
            <img src={`${M}/see-f${i}.webp`} alt="" loading="lazy" />
            <span className="num">{a === 0 ? "now" : `−${a} s`}</span>
          </div>
        ))}
        <p className={s.stripNote}>
          Past <b className="num">{FRAMES.maxAgeMs / 1000} s</b> a frame is stale, and Boomer says so.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── 03 identify ─────────────────────────

const COMPONENTS = [
  "kitchen countertop receptacle",
  "kitchen island receptacle",
  "bathroom receptacle",
  "outdoor receptacle",
  "standard receptacle",
  "GFCI receptacle",
  "light switch",
  "light fixture",
  "breaker panel",
  "junction box",
  "other",
];

function IdentifyVisual({ active }: { active: boolean }) {
  const lines: [string, string, string?][] = [
    ["component", `"standard receptacle"`, "one of 11"],
    ["problem", `"an outlet to swap for a GFCI"`],
    ["jobType", `"gfci-swap"`, "→ Swap an outlet for a GFCI"],
    ["confidence", "0 – 1"],
    ["source", `"gemini" | "fallback"`],
  ];
  return (
    <div className={`${s.identify} ${active ? s.on : ""}`}>
      <div className={s.framesIn} aria-hidden="true">
        {[0, 2, 4].map((i) => (
          <img key={i} src={`${M}/see-f${i}.webp`} alt="" loading="lazy" />
        ))}
        <span>3 newest frames + “swapping this outlet for a GFCI”</span>
      </div>
      <div className={s.readout} role="group" aria-label="Shape of the look tool's result">
        <p className={s.readHead}>
          <Glyph id="look" size={18} /> look → identifyJob()
        </p>
        <pre className={s.json}>
          <span className={s.jl}>{"{"}</span>
          {lines.map(([k, v, c], i) => (
            <span key={k} className={s.jl} style={{ "--i": i + 1 } as React.CSSProperties}>
              {"  "}
              <span className={s.jk}>{k}</span>: <span className={s.jv}>{v}</span>
              {c && <span className={s.jc}>{"  // " + c}</span>}
            </span>
          ))}
          <span className={s.jl} style={{ "--i": 6 } as React.CSSProperties}>
            {"}"}
          </span>
        </pre>
      </div>
      <ul className={s.enum} aria-label="The 11 components the model must choose from">
        {COMPONENTS.map((c) => (
          <li key={c} className={c === "standard receptacle" ? s.pick : ""}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────────────────── 04 plan ─────────────────────────

function Check({ kind }: { kind: "spoken" | "vision" }) {
  return (
    <span className={s.kind}>
      {kind === "vision" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M1.5 4.5h3l1.2-2h4.6l1.2 2h3v9h-13z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M2 2.5h12v8.5H7l-3.5 3v-3H2z" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      {kind === "vision" ? "Seen on camera" : "Spoken"}
    </span>
  );
}

function PlanVisual({ active }: { active: boolean }) {
  return (
    <div className={`${s.plan} ${active ? s.on : ""}`}>
      <div className={s.planHead}>
        <p>
          <b>Swap an outlet for a GFCI</b>
          <span>data/steps.json · six steps · hand-checked · inert demo prop</span>
        </p>
      </div>
      <ol className={s.steps}>
        {STEPS.map((st, i) => (
          <li key={st.id} style={{ "--i": i } as React.CSSProperties}>
            <span className={`${s.sn} num`}>{st.n}</span>
            <span className={s.stx}>{st.short}</span>
            <span className={s.smeta}>
              {st.hardGate && <span className={s.gate}>Hard gate</span>}
              <Check kind={st.kind} />
            </span>
          </li>
        ))}
      </ol>
      <div className={s.juris}>
        <div>
          <span className={s.jcity}>{PHILLY.city}, {PHILLY.state}</span>
          <span className="num">NEC {PHILLY.necEdition}</span>
          <a href={PHILLY.sourceUrl} target="_blank" rel="noreferrer">
            L&amp;I applicable codes ↗
          </a>
        </div>
        <svg viewBox="0 0 64 16" aria-hidden="true" className={s.arrow}>
          <path d="M0 8h60M54 3l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div>
          <span className={s.jcity}>{PRINCETON.city}, {PRINCETON.state}</span>
          <span className="num">NEC {PRINCETON.necEdition}</span>
          <a href={PRINCETON.sourceUrl} target="_blank" rel="noreferrer">
            NJ DCA current codes ↗
          </a>
        </div>
      </div>
      <p className={s.planNote}>
        <b>New here on this job: none.</b> The NJ 2023 changes cover island outlets, not this swap.
      </p>
    </div>
  );
}

// ───────────────────────── 05 sign-off ─────────────────────────

function SignoffVisual({ active }: { active: boolean }) {
  const plan = STEPS.map((st) => `${st.n}. ${st.text}`);
  return (
    <div className={`${s.thread} ${active ? s.on : ""}`}>
      <p className={s.threadHead}>
        <Glyph id="share" size={18} /> iMessage · plan sent to the supervisor
      </p>
      <div className={`${s.bubble} ${s.from}`} style={{ "--i": 0 } as React.CSSProperties}>
        <p>Boomer: Demo Electrician has a plan ready for your OK.</p>
        <p>Job: Swap an outlet for a GFCI in Princeton, NJ.</p>
        <p className={s.planList}>{plan.join("\n")}</p>
        <p>Reply APPROVE to start, or reply with any changes.</p>
      </div>
      <div className={`${s.bubble} ${s.to}`} style={{ "--i": 1 } as React.CSSProperties}>
        <p>Approve, but show me the LINE side before you mount it</p>
      </div>
      <div className={s.parse} style={{ "--i": 2 } as React.CSSProperties}>
        <span className={s.parseK}>parseDecision()</span>
        <span>
          status <b>changes</b>
        </span>
        <span>
          note <b>“show me the LINE side before you mount it”</b>
        </span>
      </div>
      <div className={`${s.said}`} style={{ "--i": 3 } as React.CSSProperties}>
        <Glyph id="guide" size={18} />
        <p>
          “Your supervisor approved the plan with a note: ‘show me the LINE side before you mount it’.”
          <span>Read before step 1. A note never removes a hard gate.</span>
        </p>
      </div>
      <p className={s.label}>Representative exchange · reply parsing and wording from lib/jobs/approval.ts</p>
    </div>
  );
}

// ───────────────────────── 06 guide / spoken gate ─────────────────────────

const METER: Box[] = [
  { x: 0.417, y: 0.383, w: 0.077, h: 0.078, label: "Multimeter", align: "right" },
  { x: 0.39, y: 0.47, w: 0.116, h: 0.2, label: "Test leads", side: "bottom" },
  { x: 0.5, y: 0.356, w: 0.106, h: 0.194, label: "Pulled device" },
  { x: 0.231, y: 0.367, w: 0.11, h: 0.317, label: "Tool pouch", side: "bottom" },
];

function GuideVisual({ active }: { active: boolean }) {
  return (
    <div className={s.stack}>
      <Frame
        boxes={METER}
        note="Boxes: illustrative annotation in the lesson editor's style, not model output"
        caption={
          <>
            <span>Meter on a device pulled from its box</span>
            <span>Pexels · Johnny Chen</span>
          </>
        }
      >
        <StageVideo src={`${M}/test-meter.mp4`} poster={`${M}/test-meter.webp`} active={active} label="Electrician holding a multimeter to a device pulled from a wall box" />
        <Annotations boxes={METER} on={active} />
      </Frame>
      <ol className={`${s.talk} ${active ? s.on : ""}`} aria-label="Spoken gate on step 2">
        <li className={s.bo} style={{ "--i": 0 } as React.CSSProperties}>
          <Glyph id="guide" size={16} />
          <p>Step 2. Test it dead and tell me the reading.</p>
        </li>
        <li className={s.wk} style={{ "--i": 1 } as React.CSSProperties}>
          <Glyph id="human" size={16} />
          <p>I think so.</p>
        </li>
        <li className={s.bo} style={{ "--i": 2 } as React.CSSProperties}>
          <Glyph id="judge" size={16} />
          <p>I need a clear answer on this one. Tell me what the tester reads.</p>
        </li>
        <li className={s.wk} style={{ "--i": 3 } as React.CSSProperties}>
          <Glyph id="human" size={16} />
          <p>Reads zero.</p>
        </li>
        <li className={s.ok} style={{ "--i": 4 } as React.CSSProperties}>
          <i className={s.ring} />
          <p>
            <b>Worker confirmed</b>, not seen. A camera can’t establish absence of voltage, so the electrician tests and
            says so.
          </p>
        </li>
      </ol>
    </div>
  );
}

// ───────────────────────── 07 check ─────────────────────────

/** Schematic back of a GFCI. LINE and LOAD pairs; wires land on LOAD (beat 0) or LINE (beat 1). */
function Gfci({ fixed }: { fixed: boolean }) {
  return (
    <svg viewBox="0 0 320 400" className={s.gfci} role="img" aria-label={fixed ? "Schematic: both incoming wires on the LINE pair" : "Schematic: incoming wires on the LOAD pair"}>
      <rect x="70" y="20" width="180" height="360" rx="6" className={s.gBody} />
      <rect x="96" y="36" width="128" height="14" rx="2" className={s.gStrap} />
      <rect x="96" y="350" width="128" height="14" rx="2" className={s.gStrap} />
      {/* LOAD pair, upper; LINE pair, lower (schematic) */}
      <text x="160" y="118" className={s.gLabel}>LOAD</text>
      <text x="160" y="268" className={s.gLabel}>LINE</text>
      <circle cx="86" cy="140" r="11" className={s.brass} />
      <circle cx="234" cy="140" r="11" className={s.silver} />
      <circle cx="86" cy="290" r="11" className={s.brass} />
      <circle cx="234" cy="290" r="11" className={s.silver} />
      <circle cx="234" cy="214" r="9" className={s.green} />
      <text x="214" y="218" className={s.gSmall} textAnchor="end">GND</text>
      {/* incoming hot (black) and neutral (white) */}
      <path className={`${s.wire} ${s.hot}`} d={fixed ? "M0 330 C40 330 50 290 86 290" : "M0 330 C50 330 40 140 86 140"} />
      <path className={`${s.wire} ${s.neu}`} d={fixed ? "M320 330 C280 330 270 290 234 290" : "M320 330 C270 330 280 140 234 140"} />
      <path className={`${s.wire} ${s.gnd}`} d="M320 250 C290 250 270 214 234 214" />
      <rect x={64} y={fixed ? 274 : 124} width="192" height="32" rx="4" className={fixed ? s.hiOk : s.hiNo} />
    </svg>
  );
}

const VOTES = [
  { r: "Inspector", m: "gemini-3.5-flash-lite", a: "not yet", b: "looks right" },
  { r: "Wiring", m: "gemini-3.8-flash", a: "not yet", b: "looks right" },
  { r: "Photo skeptic", m: "gemini-3.5-flash", a: "can't tell", b: "looks right" },
];

function CheckVisual({ active, beat }: { active: boolean; beat: number }) {
  const fixed = beat >= 1;
  return (
    <div className={`${s.check} ${active ? s.on : ""} ${fixed ? s.fixed : ""}`}>
      <div className={s.gWrap}>
        <Gfci fixed={fixed} />
        <p className={s.label}>Schematic of the inert demo prop · not a wiring diagram for live work</p>
      </div>
      <div className={s.panel}>
        <p className={s.panelHead}>
          <Glyph id="checker" size={18} /> check_step → checkStep() · step 5
        </p>
        <ul className={s.votes}>
          {VOTES.map((v, i) => {
            const o = fixed ? v.b : v.a;
            return (
              <li key={v.r} style={{ "--i": i } as React.CSSProperties}>
                <span className={s.vr}>{v.r}</span>
                <span className={`${s.vm} num`}>{v.m}</span>
                <span className={`${s.vo} ${o === "looks right" ? s.vOk : o === "not yet" ? s.vNo : s.vUn}`}>{o}</span>
              </li>
            );
          })}
        </ul>
        <div className={s.verdict} style={{ "--i": 3 } as React.CSSProperties}>
          <span className="num">{fixed ? "3 of 3" : "2 of 3"}</span>
          <b className={fixed ? s.vOk : s.vNo}>{fixed ? "Looks right." : "Not yet."}</b>
        </div>
        <p className={s.say} style={{ "--i": 4 } as React.CSSProperties}>
          {fixed ? "Looks right." : "“Not yet. Those are the LOAD terminals. Move both wires to the pair marked LINE.”"}
        </p>
        <p className={s.label}>
          Votes illustrative. Rule from checkStep(): 2 of 3 decide; a split is “can’t tell”, never “looks right”.
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── 08 record ─────────────────────────

const REC = [
  { st: "confirmed", note: "Worker confirmed, not seen" },
  { st: "confirmed", note: "Worker confirmed: “reads zero”" },
  { st: "seen", note: "Looks right, seen on camera" },
  { st: "seen", note: "Looks right, seen on camera" },
  { st: "seen", note: "Corrected after 1 not yet", corrected: true },
  { st: "confirmed", note: "Worker confirmed, not seen" },
];

function RecordVisual({ active }: { active: boolean }) {
  return (
    <div className={`${s.record} ${active ? s.on : ""}`}>
      <div className={s.sheet}>
        <p className={s.recTitle}>Swap an outlet for a GFCI</p>
        <p className={s.recMeta}>
          Princeton, NJ · NEC 2023 · journeyman · <span className="num">6 / 6 steps</span>
        </p>
        <span className={s.tape}>Observed by Boomer</span>
        <ol className={s.recRows}>
          {STEPS.map((st, i) => (
            <li key={st.id} style={{ "--i": i } as React.CSSProperties}>
              <span className={`${s.sn} num`}>{st.n}</span>
              <span className={s.stx}>
                {st.short}
                <span className={`${s.mark} ${REC[i].corrected ? s.mNo : ""}`}>
                  <i className={REC[i].st === "seen" ? s.dot : s.ring} />
                  {REC[i].note}
                </span>
              </span>
              {REC[i].st === "seen" ? <span className={s.recThumb} style={{ backgroundImage: `url(${M}/test-meter.webp)` }} /> : <span />}
            </li>
          ))}
        </ol>
      </div>
      <div className={s.recText}>
        <p className={s.threadHead}>
          <Glyph id="recorder" size={18} /> finish_job → closeJob()
        </p>
        <div className={s.said}>
          <Glyph id="guide" size={18} />
          <p>“That’s the job. I’ve saved it to your record and texted you the link.”</p>
        </div>
        <div className={`${s.bubble} ${s.from}`}>
          <p>
            [Job 2041] Swap an outlet for a GFCI, Princeton NJ (2023 NEC). 6 of 6 steps done: 3 seen on camera, 1 corrected.
            Your record: <span className={s.link}>…/job/demo-2041/record</span>
          </p>
        </div>
        <p className={s.label}>Text format from recordText() · thumbnails illustrative</p>
      </div>
    </div>
  );
}

// ───────────────────────── 09 lesson ─────────────────────────

const CLIPS = [
  { k: "action", l: "Action", w: 18 },
  { k: "worker_confirmation", l: "Worker confirms", w: 18 },
  { k: "mistake", l: "Mistake", w: 16 },
  { k: "correction", l: "Correction", w: 20 },
  { k: "action", l: "Action", w: 18 },
];

function LessonVisual({ active }: { active: boolean }) {
  return (
    <div className={`${s.lesson} ${active ? s.on : ""}`}>
      <Frame
        boxes={METER.slice(0, 3)}
        note="Up to 12 boxes or arrows per clip, only on a freeze frame (≤ 8 s) · illustrative"
        caption={
          <>
            <span>Freeze frame with box annotations, as the lesson editor draws them</span>
          </>
        }
      >
        <img className={s.video} src={`${M}/test-meter.webp`} alt="Freeze frame of a meter test at a wall box" loading="lazy" />
        <Annotations boxes={METER.slice(0, 3)} on={active} />
      </Frame>
      <div className={s.timeline} aria-label="Lesson timeline: clips by kind">
        {CLIPS.map((c, i) => (
          <span key={i} className={s.clip} data-k={c.k} style={{ flex: `${c.w} 1 0` } as React.CSSProperties}>
            {c.l}
          </span>
        ))}
        <i className={s.freeze} aria-hidden="true" />
      </div>
      <ul className={s.gates}>
        <li>
          <i className={s.ringNo} /> Electrician review required
        </li>
        <li>
          <i className={s.ringNo} /> Worker publishing permission required
        </li>
        <li>
          <i className={s.ringNo} /> Fixture or mocked-check lessons can’t be published
        </li>
      </ul>
      <p className={s.label}>Gate wording from publishProblems() · no real lesson is published yet</p>
    </div>
  );
}

// ───────────────────────── switch ─────────────────────────

export function StageVisual({ id, active, beat }: { id: StageId; active: boolean; beat: number }) {
  switch (id) {
    case "call":
      return <CallVisual active={active} />;
    case "see":
      return <SeeVisual active={active} />;
    case "identify":
      return <IdentifyVisual active={active} />;
    case "plan":
      return <PlanVisual active={active} />;
    case "signoff":
      return <SignoffVisual active={active} />;
    case "guide":
      return <GuideVisual active={active} />;
    case "check":
      return <CheckVisual active={active} beat={beat} />;
    case "record":
      return <RecordVisual active={active} />;
    case "lesson":
      return <LessonVisual active={active} />;
  }
}
