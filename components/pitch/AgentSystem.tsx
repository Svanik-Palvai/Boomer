"use client";
// OWNER: Pitch presentation. Functional roles mirror lib/types.ts; examples never call providers.
import { useState } from "react";
import { agents, voiceTools } from "./judging";
import s from "./technical.module.css";
const core = [
  {
    name: "Voice guide",
    provider: "PHOTON + ELEVENLABS",
    verb: "One step, spoken clearly.",
    text: "The call reads the current job and invokes nine server tools. The backend owns advancement, hard gates and recovery after a dropped call.",
    source: "lib/agent/tools.ts",
    example: "Worker: ‘Done. Check that.’ → check_step",
  },
  {
    name: "Visual checker",
    provider: "GEMINI + STEP ENGINE",
    verb: "Look at the actual evidence.",
    text: "Recent camera frames and one step question produce looks right, not yet, or unclear. Spoken confirmations remain distinct from camera observations.",
    source: "lib/ai/checkStep.ts",
    example:
      "Example: LOAD terminals visible → ‘Not yet.’ → repeat current step",
  },
  {
    name: "Record writer",
    provider: "JOB BACKEND + PHOTON IMESSAGE",
    verb: "Keep the work with the worker.",
    text: "Closing the job builds an evidence record and sends its link. It retains corrections, step photos and local sources. This writer is separate from the recorder chat workflow.",
    source: "lib/record/buildEntry.ts",
    example: "Completed job → work record → requested delivery / sharing",
  },
] as const;
export default function AgentSystem() {
  const [selected, setSelected] = useState(0);
  const role = core[selected];
  return (
    <section id="agents" data-section className={s.agents}>
      <div className={s.label}>
        <span>06 / TECHNOLOGY</span>
        <span>THREE CORE ROLES. ONE SHARED JOB.</span>
      </div>
      <div className={s.heading}>
        <h2>
          See it.
          <br />
          <em>Guide it. Remember it.</em>
        </h2>
        <p>
          Voice, vision and records read the same job state. These are
          functional roles; the checker and writer run through the backend.
        </p>
      </div>
      <div className={s.coreRoles} aria-label="Core system roles">
        {core.map((a, i) => (
          <button
            key={a.name}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span>
              0{i + 1} / {a.provider}
            </span>
            <b>{a.name}</b>
            <small>{a.verb}</small>
          </button>
        ))}
      </div>
      <div className={s.sharedMemory}>
        <span>SHARED JOB MEMORY</span>
        <p>
          Worker profile · confirmed town · reviewed steps · recent frames ·
          observations · voice and text history
        </p>
        <small>
          Backend memory reconnects the call and the thread. It is not
          represented as a separate Photon-native database.
        </small>
      </div>
      <article className={s.coreDetail} aria-live="polite">
        <span className={s.micro}>{role.provider}</span>
        <h3>{role.verb}</h3>
        <p>{role.text}</p>
        <p className={s.detail}>{role.example}</p>
        <a
          href={`https://github.com/Svanik-Palvai/Boomer/blob/codex/reviewed-video-lessons/${role.source}`}
          target="_blank"
          rel="noreferrer"
        >
          Inspect {role.name.toLowerCase()} implementation ↗
        </a>
      </article>
      <details className={s.toolCatalog}>
        <summary>
          Supporting text workflows & the {voiceTools.length} voice tools
        </summary>
        <div className={s.supporting}>
          {agents
            .filter((a) => a.id !== "guide")
            .map((a) => (
              <article key={a.id}>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
                <a
                  href={`https://github.com/Svanik-Palvai/Boomer/blob/codex/reviewed-video-lessons/${a.source}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open implementation ↗
                </a>
              </article>
            ))}
        </div>
        <ul>
          {voiceTools.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
      </details>
      <div className={s.coreDetail}>
        <span className={s.micro}>
          AFTER THE CALL / SEPARATE LESSON PIPELINE
        </span>
        <p>
          Consented video + original audio + transcript → evidence-grounded edit
          proposal → editable captions and freeze-frame labels → laptop FFmpeg
          render → electrician review + worker permission → public lesson.
        </p>
        <a href="#lessons">Explore reviewed lessons ↗</a>
      </div>
    </section>
  );
}
