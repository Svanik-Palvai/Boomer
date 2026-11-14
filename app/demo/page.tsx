// OWNER: Pitch presentation. Styled entrypoint; existing product screens and shared route contracts are preserved.
import type { Metadata } from "next";
import Link from "next/link";
import { DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { pages } from "@/lib/routes";
import { USE_MOCKS } from "@/lib/config";
import { SAFETY_LINE } from "@/lib/copy";
import p from "@/components/pitch/pitch.module.css";
import s from "./demo.module.css";
export const metadata: Metadata = { title: "Boomer — Field demo console" };
const groups = [
  {
    n: "01",
    name: "Get the worker ready.",
    device: "WORKER’S PHONE",
    copy: "Set the home jurisdiction and experience level, then open the harness camera. Keep the inert prop in clear view.",
    links: [
      {
        href: pages.profile(),
        name: "Worker profile",
        detail: "Home state + experience",
      },
      {
        href: pages.camera(DEMO_WORKER_ID),
        name: "Harness camera",
        detail: "Start the camera on the mounted phone",
      },
    ],
  },
  {
    n: "02",
    name: "Run the guided call.",
    device: "JUDGE’S LAPTOP",
    copy: "Call the Photon number. The ElevenLabs voice agent uses the shared job, Gemini checks and the reviewed step template.",
    links: [
      {
        href: pages.liveJob(DEMO_JOB_ID),
        name: "Open live job monitor",
        detail: "Current frame, step and agent response",
      },
      {
        href: "/#agents",
        name: "Meet the agents",
        detail: "Guide, signup, recorder and sharing",
      },
    ],
  },
  {
    n: "03",
    name: "Show what follows.",
    device: "RECORDS & HANDOFF",
    copy: "After completion, inspect the saved observations, spoken confirmations and correction history. The record belongs to the worker.",
    links: [
      {
        href: pages.jobRecord(DEMO_JOB_ID),
        name: "Job record",
        detail: "Appears after the job closes",
      },
      {
        href: pages.workRecord(DEMO_WORKER_ID),
        name: "Portable work record",
        detail: "Job history and regional references",
      },
    ],
  },
];
export default function Demo() {
  const line = process.env.PHOTON_NUMBER?.replace(/[\s().-]/g, "") ?? "";
  const phone = /^\+[1-9]\d{7,14}$/.test(line) ? line : null;
  return (
    <div className={p.pitch}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          BOOMER ↗
        </Link>
        <span>FIELD DEMO / HACKPRINCETON 2026</span>
        <Link href="/#tracks">Judging tracks ↗</Link>
      </header>
      <main className={s.main}>
        <div className={s.meta}>
          <span>LIVE DEMO CONSOLE</span>
          <span>JOB {DEMO_JOB_ID.replace(/^demo-/, "")} / PRINCETON, NJ</span>
        </div>
        <section className={s.hero} aria-labelledby="demo-title">
          <div>
            <span className={s.eyebrow}>
              A PHOTON VOICE AGENT. A REAL FIELD WORKFLOW.
            </span>
            <h1 id="demo-title">
              Put Boomer
              <br />
              <em>to work.</em>
            </h1>
            <p>
              A phone in the harness. An agent on the call. Follow one staged
              job from the first frame to the record that travels.
            </p>
          </div>
          <aside className={s.monitor}>
            <span className={s.eyebrow}>OPEN THIS ON THE JUDGE’S LAPTOP</span>
            <h2>
              Watch the job.
              <br />
              Hear the agent.
            </h2>
            <p>
              Open the monitor, then run the call from the worker’s phone. Use
              two devices if the call interrupts the camera.
            </p>
            <Link className={s.primary} href={pages.liveJob(DEMO_JOB_ID)}>
              Open live monitor <span aria-hidden="true">↗</span>
            </Link>
            <div className={s.mode}>
              <span className={s.dot} />
              {USE_MOCKS
                ? "AI checks: preloaded demo mode"
                : "AI checks: live mode requested"}
            </div>
          </aside>
        </section>
        <div className={s.stack} aria-label="Demo technologies">
          <span>PHOTON VOICE + IMESSAGE</span>
          <span>ELEVENLABS AGENT</span>
          <span>GEMINI VISION</span>
          <span>SHARED JOB MEMORY</span>
        </div>
        <div className={s.workflow}>
          {groups.map((group) => (
            <section className={s.workflowStep} key={group.n}>
              <div className={s.stepNumber}>{group.n}</div>
              <div>
                <span className={s.eyebrow}>{group.device}</span>
                <h2>{group.name}</h2>
                <p>{group.copy}</p>
                <div className={s.links}>
                  {group.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <span>
                        <b>{link.name}</b>
                        <small>{link.detail}</small>
                      </span>
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
                {group.n === "02" && (
                  <div className={s.call}>
                    {phone ? (
                      <a href={`tel:${phone}`}>Call Boomer · {phone} ↗</a>
                    ) : (
                      <p>
                        The team supplies the configured Photon number for the
                        live call.
                      </p>
                    )}
                    <small>
                      A working call needs the team’s Photon/SIP/ElevenLabs
                      configuration. The monitor alone does not start a call.
                    </small>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
        <section
          id="sheets"
          className={s.sheets}
          aria-labelledby="sheets-title"
        >
          <div>
            <span className={s.eyebrow}>PHOTON 1.0 / IMESSAGE MINI APPS</span>
            <h2 id="sheets-title">The job, in the thread.</h2>
            <p>
              Inspect the actual mini-app sheets. Photon 1.0 delivers the cards;
              Photon 2.0 powers the voice/text integration. Delivery falls back
              to a link when needed.
            </p>
          </div>
          <div className={s.sheetLinks}>
            <Link href={pages.miniJob(DEMO_JOB_ID)}>
              <span>01 / LIVE SHEET</span>
              <b>Job mini app</b>
              <small>Progress, current step and observations ↗</small>
            </Link>
            <Link href={pages.miniRecord(DEMO_WORKER_ID)}>
              <span>02 / WORKER SHEET</span>
              <b>Record mini app</b>
              <small>Portable job history in an iMessage card ↗</small>
            </Link>
          </div>
        </section>
        <section className={s.lesson}>
          <div>
            <span className={s.eyebrow}>AFTER THE WORK</span>
            <h2>From one job to the next lesson.</h2>
            <p>
              Private recording, evidence-based editing and human review before
              a lesson can be published.
            </p>
          </div>
          <Link href="/lessons">Open reviewed lessons ↗</Link>
        </section>
        <footer className={s.footer}>
          <span>INERT PROP / SIMULATED ELECTRICAL TESTS</span>
          <p>{SAFETY_LINE}</p>
          <p>
            {USE_MOCKS
              ? "This deployment uses preloaded AI checks. The pitch’s example replay is separate from this product workflow."
              : "Live AI mode is selected. Confirm provider configuration and physical-device behavior with the team before the walkthrough."}
          </p>
          <Link href="/">← Back to the pitch</Link>
        </footer>
      </main>
    </div>
  );
}
