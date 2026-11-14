"use client";
// OWNER: Pitch presentation. Agent examples are local replays, not requests to live services.
import { useEffect, useRef, useState } from "react";
import { agents, voiceTools } from "./judging";
import s from "./technical.module.css";
export default function AgentSystem() {
  const root = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (manual) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setSelected(Number(e.target.getAttribute("data-agent-step")));
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: 0 },
    );
    root.current
      ?.querySelectorAll("[data-agent-step]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [manual]);
  function chooseAgent(index: number) {
    setSelected(index);
    setManual(true);
    if (
      matchMedia(
        "(min-width: 900px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)",
      ).matches
    ) {
      root.current
        ?.querySelector(`[data-agent-step="${index}"]`)
        ?.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
    }
  }
  const agent = agents[selected];
  return (
    <section ref={root} id="agents" data-section className={s.agents}>
      <div className={s.label}>
        <span>06 / MEET THE AGENTS</span>
        <span>PHOTON CHANNELS. SHARED CONTEXT.</span>
      </div>
      <div className={s.heading}>
        <h2>
          An agent on the call.
          <br />
          <em>A system behind it.</em>
        </h2>
        <p>
          One ElevenLabs voice agent on a Photon number. Three routed text-agent
          workflows. Worker profiles and shared job memory connect the work.
        </p>
      </div>
      <div className={s.agentCounts}>
        <span>
          <b>1</b> voice agent
        </span>
        <span>
          <b>3</b> routed text-agent workflows
        </span>
        <span>
          <b>{voiceTools.length}</b> voice server tools
        </span>
      </div>
      <div className={s.agentLayout}>
        <div className={s.agentSticky}>
          <div
            className={s.agentMap}
            aria-label="Select an agent to inspect its example"
          >
            <svg
              viewBox="0 0 600 330"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M145 70L300 165L455 70M145 260L300 165L455 260" />
            </svg>
            <div className={s.memoryHub}>
              <span>SHARED CONTEXT</span>
              <b>One job.</b>
              <small>
                Profile · steps · observations
                <br />
                voice + text history
              </small>
            </div>
            {agents.map((a, i) => (
              <button
                key={a.id}
                className={s.agentNode}
                data-agent={a.id}
                aria-pressed={selected === i}
                onClick={() => chooseAgent(i)}
              >
                <span>0{i + 1}</span>
                <b>{a.name}</b>
                <small>
                  {a.id === "guide"
                    ? "Voice"
                    : a.id === "signup"
                      ? "Profile setup"
                      : "Text + job context"}
                </small>
              </button>
            ))}
          </div>
          <div className={s.example}>
            <div className={s.exampleTop}>
              <span>ILLUSTRATIVE REPLAY / NO MESSAGE SENT</span>
              <button onClick={() => setManual(false)} disabled={!manual}>
                {manual ? "Follow scroll ↘" : "Following scroll"}
              </button>
            </div>
            <span className={s.micro}>{agent.channel}</span>
            <p className={s.request}>“{agent.request}”</p>
            <div className={s.agentResponse}>
              <span>{agent.name}</span>
              <p>{agent.response}</p>
            </div>
            <div className={s.memoryLine}>
              <span>CONTEXT</span>
              {agent.memory}
            </div>
          </div>
        </div>
        <div className={s.agentSteps}>
          {agents.map((a, i) => (
            <article
              key={a.id}
              data-agent-step={i}
              data-active={selected === i}
            >
              <span className={s.micro}>
                0{i + 1} / {a.channel}
              </span>
              <h3>{a.name}</h3>
              <h4>{a.verb}</h4>
              <p>{a.description}</p>
              <ul className={s.tools}>
                {a.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p className={s.detail}>{a.detail}</p>
              <a
                href={`https://github.com/Svanik-Palvai/Boomer/blob/main/${a.source}`}
                target="_blank"
                rel="noreferrer"
              >
                Inspect the implementation ↗
              </a>
            </article>
          ))}
        </div>
      </div>
      <details className={s.toolCatalog}>
        <summary>The voice agent’s {voiceTools.length} tools</summary>
        <ul>
          {voiceTools.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
        <p>
          The LLM chooses a tool and speaks its response. The backend owns
          steps, hard gates and job transitions. Text agents are routed
          workflows—not four independent voice models.
        </p>
      </details>
    </section>
  );
}
