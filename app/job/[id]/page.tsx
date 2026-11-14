"use client";
// OWNER: Andy (screens). Live job view (laptop, faces the judge): latest frame, step list with ticks
// and New here tags, the agent's last line. Polls the job every second.
import { useEffect } from "react";
import Link from "next/link";
import type { Job } from "@/lib/types";
import { useJob } from "@/components/hooks/useJob";
import { useLatestFrame } from "@/components/hooks/useLatestFrame";
import { Banner, FlowSteps } from "@/components/screens/shell";
import { StepList, StepRow } from "@/components/screens/steps";
import { api, pages } from "@/lib/routes";
import { FRAMES } from "@/lib/config";
import { SAY, STATUS_LABEL } from "@/lib/copy";
import s from "./live.module.css";

export default function LiveJobPage({ params }: { params: { id: string } }) {
  const { data: job, stale, notFound } = useJob(params.id, { intervalMs: 1000 });
  const frame = useLatestFrame(params.id);

  // Keep the step being worked on screen as the job moves down the list.
  const current = job?.current;
  useEffect(() => {
    document.querySelector("[data-current-step]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);

  if (notFound)
    return (
      <main>
        <h1>No job {params.id}</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          A job opens when the harness camera sends its first frame.
        </p>
      </main>
    );
  if (!job)
    return (
      <main className={s.page}>
        <p className="muted">Loading job {params.id}…</p>
      </main>
    );

  const guiding = job.status === "guiding";
  const stepNo = Math.min(job.current + 1, job.steps.length);

  return (
    <main className={s.page}>
      <header className={s.head}>
        <div>
          <h1 className={s.title}>{job.title ?? "New job"}</h1>
          <p className={s.place}>
            <Place job={job} />
          </p>
        </div>
        <p className={s.status}>
          {guiding ? (
            <>
              Step <span className="num">{stepNo}</span> of <span className="num">{job.steps.length}</span>
            </>
          ) : (
            STATUS_LABEL[job.status]
          )}
        </p>
      </header>
      {(job.status === "new" || job.status === "looking") && <FlowSteps current={STATUS_LABEL[job.status] as "New"} />}
      {stale && <Banner tone="error">Lost the connection to the server. Retrying…</Banner>}

      <div className={s.grid}>
        <figure className={s.frame}>
          {frame.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frame.src} alt="What the harness camera sees now" />
          ) : (
            <figcaption className={s.noFrame}>
              No pictures yet. Open the camera page on the harness phone and tap Start camera.
            </figcaption>
          )}
          {frame.ageMs != null && <FrameAge ageMs={frame.ageMs} />}
        </figure>

        <section className={s.side} aria-label="Guided call">
          <LastLine job={job} />
          {job.status === "done" && (
            <p className={s.closing}>
              Job done.{" "}
              {job.recordId ? <Link href={pages.jobRecord(job.id)}>Open the record</Link> : "Writing the record…"}
            </p>
          )}
          {job.status === "stopped" && (
            <Banner tone="error">
              Stopped{job.stoppedReason ? `: ${job.stoppedReason}` : ""}. The work is left as it is.
            </Banner>
          )}
          {job.steps.length > 0 ? (
            <div className={s.steps}>
              <StepList label="Steps">
                {job.steps.map((step, i) => {
                  const r = job.results.find((x) => x.stepId === step.id) ?? job.results[i];
                  return (
                    <StepRow
                      key={step.id}
                      current={guiding && i === job.current}
                      step={{
                        ...step,
                        status: r?.status ?? "pending",
                        fails: r?.fails ?? 0,
                        spoken: step.check.kind === "spoken",
                        thumb: r?.frameId
                          ? `${api.latestFrame(job.id)}?frameId=${encodeURIComponent(r.frameId)}`
                          : undefined,
                      }}
                    />
                  );
                })}
              </StepList>
            </div>
          ) : (
            <p className={s.empty}>
              {job.identity
                ? `Boomer sees ${job.identity.component}: ${job.identity.problem}. Building the steps.`
                : "Boomer builds the steps once it knows the job."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Place({ job }: { job: Job }) {
  const home = `${job.home.city}, ${job.home.state}`;
  if (!job.site) return <>Home {home} · finding the job site</>;
  return (
    <>
      <strong>
        {job.site.city}, {job.site.state}
      </strong>{" "}
      {job.site.necEdition} NEC
      {!job.siteConfirmed && " (not confirmed yet)"}
      <span className={s.sep}> · </span>
      home {home} {job.home.necEdition} NEC
    </>
  );
}

function FrameAge({ ageMs }: { ageMs: number }) {
  const sec = Math.round(ageMs / 1000);
  const old = ageMs > FRAMES.maxAgeMs;
  return (
    <p className={`${s.age} ${old ? s.ageOld : ""}`} role="status">
      <span className="num">{old ? `No new picture for ${sec} s` : sec <= 1 ? "Live" : `${sec} s ago`}</span>
    </p>
  );
}

function LastLine({ job }: { job: Job }) {
  const text = job.lastSay?.text;
  if (!text) return <p className={`${s.say} ${s.sayQuiet}`}>Boomer hasn&rsquo;t said anything yet.</p>;
  const lead = [SAY.notYet, SAY.looksRight].find((p) => text.startsWith(p));
  return (
    <blockquote className={s.say}>
      <p>
        <span className={s.sayWho}>Boomer: </span>
        {lead && <span className={lead === SAY.notYet ? s.leadNo : s.leadYes}>{lead}</span>}
        {lead ? text.slice(lead.length) : text}
      </p>
    </blockquote>
  );
}
