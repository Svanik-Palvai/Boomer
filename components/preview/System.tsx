"use client";
// The whole system as a one-line diagram: agents tap onto the job-memory bus the way loads tap a bus bar.
// Every edge is a real call or message in the code. The <ol> after the SVG is the same map as text
// (screen readers on every size; the visible version on phones).
import { useEffect, useRef, useState } from "react";
import s from "./system.module.css";
import { Glyph } from "./Glyphs";
import { FRAMES, type AgentId } from "./data";

type NodeKind = "agent" | "model" | "rules" | "human" | "input" | "output" | "pipeline";
interface N {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  glyph: AgentId | "human" | null;
  kind: NodeKind;
}

const W = 170;
const H = 96;
const NODES: N[] = [
  { id: "worker", x: 12, y: 64, w: 150, h: H, title: "Electrician", sub: "on the job", glyph: "human", kind: "human" },
  { id: "call", x: 180, y: 64, w: W, h: 80, title: "Phone call", sub: "Photon number · SIP", glyph: null, kind: "input" },
  { id: "cam", x: 576, y: 64, w: W, h: 80, title: "Harness camera", sub: "/camera · POST /api/frames", glyph: null, kind: "input" },

  { id: "guide", x: 180, y: 270, w: W, h: H, title: "Guide", sub: "ElevenLabs voice agent", glyph: "guide", kind: "agent" },
  { id: "look", x: 378, y: 270, w: W, h: H, title: "Look", sub: "Gemini vision", glyph: "look", kind: "model" },
  { id: "plan", x: 576, y: 270, w: W, h: H, title: "Plan", sub: "rules · no model", glyph: "plan", kind: "rules" },
  { id: "check", x: 774, y: 270, w: W, h: H, title: "Check panel", sub: "3 Gemini models · 2 of 3", glyph: "checker", kind: "model" },
  { id: "gate", x: 972, y: 270, w: W, h: H, title: "Spoken gate", sub: "worker's words · rules", glyph: "judge", kind: "rules" },

  { id: "texts", x: 12, y: 520, w: 150, h: H, title: "Worker texts", sub: "iMessage", glyph: "human", kind: "human" },
  { id: "signup", x: 180, y: 520, w: W, h: H, title: "Sign-up", sub: "iMessage agent", glyph: "signup", kind: "agent" },
  { id: "share", x: 378, y: 520, w: W, h: H, title: "Share", sub: "iMessage agent", glyph: "share", kind: "agent" },
  { id: "recorder", x: 576, y: 520, w: W, h: H, title: "Recorder", sub: "iMessage agent", glyph: "recorder", kind: "agent" },
  { id: "record", x: 774, y: 520, w: W, h: H, title: "Work record", sub: "Observed by Boomer", glyph: null, kind: "output" },
  { id: "lesson", x: 972, y: 520, w: W, h: H, title: "Lessons", sub: "FFmpeg · local worker", glyph: "lesson", kind: "pipeline" },

  { id: "super", x: 378, y: 676, w: W, h: 86, title: "Supervisor", sub: "texts back", glyph: "human", kind: "human" },
  { id: "reviewer", x: 972, y: 676, w: W, h: 86, title: "Reviewer", sub: "electrician · worker consent", glyph: "human", kind: "human" },
];

interface E {
  d: string;
  label: string;
  lx: number;
  ly: number;
  anchor?: "start" | "middle" | "end";
  tone?: "human" | "loop" | "main";
  both?: boolean;
}

const BUS_Y = 462;
/** Small semicircle hop where a line crosses another, drawn on vertical runs. */
const hop = (x: number, y: number) => `L${x} ${y - 7} A7 7 0 0 1 ${x} ${y + 7}`;

const EDGES: E[] = [
  { d: "M162 104 L180 104", label: "", lx: 0, ly: 0, tone: "human" },
  { d: "M85 64 L85 34 L661 34 L661 64", label: "phone in a chest harness", lx: 373, ly: 26, tone: "human" },
  { d: "M265 144 L265 270", label: "SIP → ElevenLabs", lx: 274, ly: 214, anchor: "start" },
  { d: "M661 144 L661 205 L463 205 L463 270", label: `fresh frames, < ${FRAMES.maxAgeMs / 1000} s`, lx: 470, ly: 197, anchor: "start" },
  { d: "M661 205 L859 205 L859 270", label: "burst ×3 on “done”", lx: 866, ly: 197, anchor: "start" },
  { d: "M548 318 L576 318", label: "jobType", lx: 562, ly: 258 },
  { d: "M944 318 L972 318", label: "can't tell ×2", lx: 958, ly: 386, tone: "loop" },
  // Tool rail under the agents: the Guide's server tools reach every reasoner; each returns one `say`.
  { d: "M265 366 L265 396 L1057 396", label: "server tools → say", lx: 300, ly: 414, anchor: "start", both: true },
  { d: "M463 396 L463 366", label: "", lx: 0, ly: 0 },
  { d: "M859 396 L859 366", label: "", lx: 0, ly: 0 },
  { d: "M1057 396 L1057 366", label: "", lx: 0, ly: 0 },
  // Plan → Share → Supervisor (approval)
  { d: `M620 366 ${hop(620, 396)} ${hop(620, BUS_Y)} L620 490 L500 490 L500 520`, label: "plan for sign-off", lx: 612, ly: 482, anchor: "end" },
  { d: `M463 616 ${hop(463, 642)} L463 676`, label: "APPROVE · changes · hold off", lx: 472, ly: 662, anchor: "start", tone: "human", both: true },
  // finish_job → record
  { d: `M900 396 ${hop(900, BUS_Y)} L900 520`, label: "finish_job → closeJob()", lx: 908, ly: 498, anchor: "start" },
  // inbox router
  { d: "M162 568 L170 568 L170 642 L661 642", label: "one text → one agent", lx: 300, ly: 660, anchor: "start" },
  { d: "M265 642 L265 616", label: "", lx: 0, ly: 0 },
  { d: "M463 642 L463 616", label: "", lx: 0, ly: 0 },
  { d: "M661 642 L661 616", label: "", lx: 0, ly: 0 },
  // record link back to the worker, and on to lessons
  { d: "M830 616 L830 784 L60 784 L60 616", label: "record link by iMessage", lx: 445, ly: 776 },
  { d: "M944 568 L972 568", label: "", lx: 0, ly: 0 },
  { d: "M1057 616 L1057 676", label: "review", lx: 1066, ly: 660, anchor: "start", tone: "human", both: true },
];

/** Taps onto the job-memory bus. */
const TAPS = [
  { x: 205, from: 366, to: BUS_Y, crosses: 396 },
  { x: 820, from: 366, to: BUS_Y, crosses: 396 },
  { x: 661, from: 520, to: BUS_Y },
  { x: 420, from: 520, to: BUS_Y },
];

const FLOW: { from: string; to: string; what: string; human?: boolean }[] = [
  { from: "Electrician", to: "Harness camera", what: "Phone in a chest harness, camera page open", human: true },
  { from: "Electrician", to: "Phone call → Guide", what: "Calls the Photon number; SIP to the ElevenLabs agent", human: true },
  { from: "Harness camera", to: "Look, Check panel", what: `A still every ${FRAMES.intervalMs / 1000} s, a burst of ${FRAMES.burst} on “done”; nothing older than ${FRAMES.maxAgeMs / 1000} s is used` },
  { from: "Guide", to: "Look → Plan", what: "`look` identifies the job; Plan builds checked steps from data" },
  { from: "Plan", to: "Share → Supervisor", what: "Plan texted for sign-off; Guide waits before step 1", human: true },
  { from: "Supervisor", to: "Share → Job memory", what: "APPROVE, changes or hold off; a note is read to the worker" },
  { from: "Guide", to: "Check panel", what: "`check_step`: 3 models vote; 2 of 3 decide; Guide speaks the result" },
  { from: "Check panel", to: "Spoken gate", what: "After 2 “can't tell”, the worker may confirm out loud (never on step 5)", human: true },
  { from: "Guide, Check, Recorder", to: "Job memory", what: "Every line, check and text lands in one memory per job" },
  { from: "Worker texts", to: "Sign-up · Share · Recorder", what: "One inbound text goes to one agent" },
  { from: "Guide", to: "Work record", what: "`finish_job` → closeJob(): RecordEntry, link texted to the worker" },
  { from: "Work record", to: "Lesson renderer → Reviewer", what: "Clips and annotations rendered; publish only after electrician review and worker consent", human: true },
];

export default function System() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${s.wrap} ${on ? s.on : ""}`}
      tabIndex={0}
      role="region"
      aria-label="System diagram (scrolls sideways on small screens)"
    >
      <svg viewBox="0 0 1180 800" className={s.svg} role="img" aria-labelledby="sys-title sys-desc">
        <title id="sys-title">Boomer system diagram</title>
        <desc id="sys-desc">The same connections are listed as text after the diagram.</desc>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="currentColor" />
          </marker>
        </defs>

        {/* Job memory bus */}
        <g className={s.bus}>
          <line x1="180" y1={BUS_Y} x2="1142" y2={BUS_Y} />
          <text x="215" y={BUS_Y - 12} textAnchor="start" className={s.busLabel}>
            JOB MEMORY · one per job · contextFor()
          </text>
        </g>
        {TAPS.map((t, i) => (
          <g key={i} className={s.tap}>
            <path d={t.crosses ? `M${t.x} ${t.from} ${hop(t.x, t.crosses)} L${t.x} ${t.to}` : `M${t.x} ${t.from} L${t.x} ${t.to}`} />
            <circle cx={t.x} cy={t.to} r="4.5" />
          </g>
        ))}

        {EDGES.map((e, i) => (
          <g key={i} className={`${s.edge} ${e.tone ? s[e.tone] : ""}`} style={{ "--i": i } as React.CSSProperties}>
            <path d={e.d} markerEnd="url(#arr)" markerStart={e.both ? "url(#arr)" : undefined} />
            {e.label && (
              <text x={e.lx} y={e.ly} textAnchor={e.anchor ?? "middle"}>
                {e.label}
              </text>
            )}
          </g>
        ))}

        {/* not-yet loop on the check panel */}
        <g className={`${s.edge} ${s.loop}`}>
          <path d="M830 270 C 830 236, 800 236, 800 262" markerEnd="url(#arr)" />
          <text x="792" y="244" textAnchor="end">
            not yet → same step
          </text>
        </g>

        {NODES.map((n) => (
          <g key={n.id} className={`${s.node} ${s[n.kind]}`} transform={`translate(${n.x} ${n.y})`}>
            <rect width={n.w} height={n.h} />
            {n.glyph && (
              <g transform="translate(14 14)" className={s.nodeGlyph}>
                <Glyph id={n.glyph} size={22} />
              </g>
            )}
            <text x="14" y={n.h - 34} className={s.nodeTitle}>
              {n.title}
            </text>
            <text x="14" y={n.h - 15} className={s.nodeSub}>
              {n.sub}
            </text>
          </g>
        ))}
      </svg>

      <div className={s.legend} aria-hidden="true">
        <span>
          <i className={s.lgAgent} /> Agent
        </span>
        <span>
          <i className={s.lgModel} /> Model call
        </span>
        <span>
          <i className={s.lgRules} /> Deterministic rules
        </span>
        <span>
          <i className={s.lgHuman} /> A person decides
        </span>
      </div>

      <ol className={s.flow} aria-label="System connections">
        {FLOW.map((f, i) => (
          <li key={i} className={f.human ? s.flowHuman : ""}>
            <p className={s.flowPath}>
              <b>{f.from}</b>
              <svg viewBox="0 0 24 12" aria-hidden="true">
                <path d="M0 6h20M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <b>{f.to}</b>
            </p>
            <p className={s.flowWhat}>{f.what}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
