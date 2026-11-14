import { jurisdictions } from "./content";
import s from "./scenes.module.css";

/** A visibly labeled example of the evidence the existing workflow combines. */
export default function HeroEvidence() {
  return <div className={s.evidenceRow} data-inputs>
    <div className={`${s.evidence} ${s.cameraInput}`} data-input>
      <span>01 / CAMERA EVIDENCE</span>
      <div className={s.cameraView}><span>LINE</span><i /><small>DEVICE LABEL IN FRAME</small></div>
      <b>What’s in front of you.</b>
      <small>Illustrated camera frame · inert GFCI prop</small>
    </div>
    <div className={s.evidence} data-input>
      <span>02 / CONFIRMED JURISDICTION</span>
      <b>Princeton, New Jersey</b>
      <div className={s.sourceRow}><span>Adopted edition</span><strong>{jurisdictions.destination.necEdition} NEC</strong></div>
      <div className={s.sourceRow}><span>Reference</span><strong>NJ code adoption ↗</strong></div>
      <small>Local sources inform the job; scope still matters.</small>
    </div>
    <div className={s.evidence} data-input>
      <span>03 / SHARED JOB STATE</span>
      <b>Connect to LINE</b>
      <div className={s.stepLine}><span>WORKER SAYS</span><strong>“Done. Check that.”</strong></div>
      <div className={s.stepLine}><span>BACKEND READS</span><strong>Current step + recent frames</strong></div>
      <small>Example job · reviewed GFCI step template</small>
    </div>
  </div>;
}
