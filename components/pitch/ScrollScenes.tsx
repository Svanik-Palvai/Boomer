// OWNER: Pitch presentation. Source-backed example and complete static record; no job mutations.
import Link from "next/link";
import { jurisdictions } from "./content";
import FieldHero from "./FieldHero";
import s from "./scenes.module.css";
export function OpeningScene() {
  return <FieldHero />;
}
export function BorderScene() {
  const { home, destination: dest } = jurisdictions;
  return (
    <section
      id="borders"
      data-section
      className={`${s.scene} ${s.border} ${s.compactBorder}`}
    >
      <div className={s.stage}>
        <div className={s.stageMeta}>
          <span>01 / THE WORKFLOW</span>
          <span>ONE WORKER / TWO JURISDICTIONS</span>
        </div>
        <div className={s.borderHeading}>
          <h2>
            Your skills travel.
            <br />
            <em>The information doesn’t.</em>
          </h2>
          <p>Confirm the place. Bring the right references into the call.</p>
        </div>
        <div className={s.centeredRoute}>
          <div>
            <span>HOME / PENNSYLVANIA</span>
            <h3>{home.city}</h3>
            <b>{home.necEdition} NEC</b>
          </div>
          <span className={s.routeArrow} aria-label="to">
            →
          </span>
          <div>
            <span>JOB / NEW JERSEY</span>
            <h3>{dest.city}</h3>
            <b>{dest.necEdition} NEC</b>
          </div>
        </div>
        <p className={s.routeScope}>
          Different adopted editions. The countertop GFCI demo does not
          establish a different LINE/LOAD installation requirement between these
          locations.
        </p>
        <details className={s.sources}>
          <summary>Official references & scope ↗</summary>
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
            <p>{dest.editionCaveat}</p>
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
  return (
    <section
      id="record"
      data-section
      className={`${s.scene} ${s.record} ${s.completeRecord}`}
    >
      <div className={s.stage}>
        <div className={s.stageMeta}>
          <span>04 / WORK RECORD</span>
          <span>ILLUSTRATED EXAMPLE / NOT A SENT MESSAGE</span>
        </div>
        <div className={s.recordGrid}>
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
              Keep the observations, corrections and sources. Share the record
              with the next employer.
            </p>
            <span className={s.recordStamp}>OBSERVED BY BOOMER ↗</span>
            <p>
              <Link href="/demo#records">Open the actual record links ↗</Link>
            </p>
          </div>
          <div className={s.recordEvidence}>
            <div className={s.recordMessage}>
              <span>PHOTON IMESSAGE / EXAMPLE</span>
              <p>
                Your GFCI demo job in Princeton is saved. Here’s the work record
                you can take to your next job.
              </p>
              <small>
                Illustrative delivery; no message sent by this page.
              </small>
            </div>
            <div className={s.recordPaper}>
              <span className={s.micro}>WORK RECORD / EXAMPLE</span>
              <h3>Kitchen GFCI · Princeton, NJ</h3>
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
              <p>
                Step photos + correction history + regional references. A camera
                observation is not an electrical test or a license.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
