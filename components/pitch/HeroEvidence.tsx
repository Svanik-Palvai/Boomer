import s from "./scenes.module.css";

/** Decorative product sketches, never connected to live job state or providers. */
export default function HeroEvidence() {
  return <>
    <div className={`${s.evidence} ${s.circuit}`}>
      <span>FIELD SCHEMATIC / CONCEPT</span>
      <svg viewBox="0 0 220 90" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 25H70V65H145V25H208M12 65H45V25H120V65H208"/><rect x="82" y="16" width="26" height="18"/><circle cx="158" cy="25" r="10"/><path d="M158 15V35M148 25H168"/></g></svg>
      <small>CONTEXT IN. CLARITY OUT.</small>
    </div>
    <div className={`${s.evidence} ${s.vision}`}>
      <span>GEMINI / VISUAL CHECK</span>
      <div className={s.visionFrame}><div className={s.terminal}>LINE<br/><small>VISIBLE LABEL</small></div><i/><b>01</b></div>
      <small>CAMERA EVIDENCE → STEP OBSERVATION</small>
    </div>
    <div className={`${s.evidence} ${s.voiceInterface}`}>
      <span>PHOTON × ELEVENLABS / VOICE</span>
      <div className={s.wave}>{[12,25,18,37,48,29,16,35,52,30,19,40,23,12,27,16].map((height,i)=><i key={i} style={{height}}/>)}</div>
      <b>“Let’s check that connection.”</b>
      <small>HANDS ON THE TOOLS. AGENT ON THE CALL.</small>
    </div>
    <div className={`${s.evidence} ${s.recordSlip}`}>
      <span>SHARED JOB MEMORY / EXAMPLE</span>
      <b>PRINCETON / GFCI</b>
      <div><span>01 / Location</span><strong>CONFIRMED</strong></div>
      <div><span>02 / Observation</span><strong>ATTACHED</strong></div>
      <div><span>03 / Work record</span><strong>PORTABLE ↗</strong></div>
      <small>OBSERVED BY BOOMER</small>
    </div>
    <div className={`${s.evidence} ${s.codeSheet}`}>
      <span>JURISDICTION / SOURCE FILE</span>
      <b>LOCAL KNOWLEDGE.</b>
      <p>Code edition<br/>Permit office<br/>Licensing scope</p>
      <small>SOURCES, NOT GUESSWORK ↗</small>
    </div>
  </>;
}
