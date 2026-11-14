import s from "./scenes.module.css";

/** Illustrative inputs an electrician may gather before a job; no live data. */
export default function HeroEvidence() {
  return <>
    <div className={`${s.evidence} ${s.circuit}`}>
      <span>FIELD SCHEMATIC / CONCEPT</span>
      <svg viewBox="0 0 220 90" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 25H70V65H145V25H208M12 65H45V25H120V65H208"/><rect x="82" y="16" width="26" height="18"/><circle cx="158" cy="25" r="10"/><path d="M158 15V35M148 25H168"/></g></svg>
      <small>WIRING PLAN / CIRCUIT PATH</small>
    </div>
    <div className={`${s.evidence} ${s.vision}`}>
      <span>CAMERA / PART IDENTIFICATION</span>
      <div className={s.visionFrame}><div className={s.terminal}>LINE<br/><small>VISIBLE LABEL</small></div><i/><b>01</b></div>
      <small>IMAGE EVIDENCE → STEP CHECK</small>
    </div>
    <div className={`${s.evidence} ${s.voiceInterface}`}>
      <span>FIELD CALL / VOICE GUIDANCE</span>
      <div className={s.wave}>{[12,25,18,37,48,29,16,35,52,30,19,40,23,12,27,16].map((height,i)=><i key={i} style={{height}}/>)}</div>
      <b>“Let’s check that connection.”</b>
      <small>HANDS FREE WHILE THE JOB IS OPEN</small>
    </div>
    <div className={`${s.evidence} ${s.recordSlip}`}>
      <span>JOB NOTES / WORK HISTORY</span>
      <b>PRINCETON / GFCI</b>
      <div><span>Location</span><strong>CONFIRMED</strong></div>
      <div><span>Step check</span><strong>OBSERVED</strong></div>
      <div><span>Job record</span><strong>SAVED ↗</strong></div>
      <small>KEEP THE DETAILS TOGETHER</small>
    </div>
    <div className={`${s.evidence} ${s.codeSheet}`}>
      <span>CODEBOOK / LOCAL EDITION</span>
      <b>REFERENCE<br/>BEFORE THE WORK</b>
      <p>Edition · amendments<br/>Source · section</p>
      <small>CHECK THE JURISDICTION</small>
    </div>
    <div className={`${s.evidence} ${s.permit}`}>
      <span>PERMIT INTAKE</span>
      <b>JOB SCOPE</b>
      <p>Residential alteration<br/>Permit office / contact</p>
      <small>CONFIRM WHAT APPLIES</small>
    </div>
    <div className={`${s.evidence} ${s.inspection}`}>
      <span>INSPECTION NOTES</span>
      <b>ROUGH-IN</b>
      <p>Schedule · checklist<br/>Corrections · sign-off</p>
      <small>LOCAL PROCESS</small>
    </div>
    <div className={`${s.evidence} ${s.siteMap}`}>
      <span>SITE / LOCATION</span>
      <div aria-hidden="true">⌖</div>
      <b>NEW TOWN.<br/>NEW CONTEXT.</b>
      <small>VERIFY BEFORE APPLYING RULES</small>
    </div>
    <div className={`${s.evidence} ${s.materials}`}>
      <span>JOB PREP / MATERIALS</span>
      <b>PARTS + TOOLS</b>
      <p>Device · wire · tester<br/>Match the plan to the site</p>
      <small>READY BEFORE THE CALL</small>
    </div>
  </>;
}
