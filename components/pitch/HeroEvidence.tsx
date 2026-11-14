import s from "./scenes.module.css";

/** Illustrative inputs only; the real workflow is presented further down the page. */
export default function HeroEvidence() {
  return <div className={s.evidenceRow}>
    <div className={s.evidence}>
      <span>01 / UNDERSTAND THE SITE</span>
      <b>Plans. Parts. Local requirements.</b>
      <svg viewBox="0 0 220 50" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12H65V38H140V12H215M5 38H35V12H110V38H215"/><rect x="77" y="6" width="20" height="12"/><circle cx="155" cy="12" r="7"/></g></svg>
      <small>Field schematic · illustrative</small>
    </div>
    <div className={s.evidence}>
      <span>02 / CHECK THE EVIDENCE</span>
      <b>A second look at the work.</b>
      <div className={s.fieldCheck}><span>LINE</span><small>LABEL IDENTIFIED</small></div>
      <small>Camera observation · example</small>
    </div>
    <div className={s.evidence}>
      <span>03 / KEEP THE RECORD</span>
      <b>The details stay with the job.</b>
      <div className={s.fieldRecord}><span>LOCATION</span><span>STEPS</span><span>SOURCES</span></div>
      <small>Shared job memory</small>
    </div>
  </div>;
}
