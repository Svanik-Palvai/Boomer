import h from "./hassles.module.css";

/**
 * The everyday hassles an electrician carries into a job, drawn as the objects they arrive on.
 * Illustrative only: no real people, inspectors, licenses or live data.
 * On scroll each card is pulled into the Boomer hub (offsets measured in ScrollScenes).
 */
export default function HeroEvidence() {
  return (
    <>
      {/* Code edition change */}
      <div className={`${h.card} ${h.book}`} data-hassle>
        <span className={h.label}>Electrical code</span>
        <b className={h.bookYear}>2023</b>
        <span className={h.bookEdition}>Edition</span>
        <span className={h.bookOld}>2020 edition</span>
        <p className={h.pain}>New edition. What changed?</p>
      </div>

      {/* Failed inspection */}
      <div className={`${h.card} ${h.tag}`} data-hassle>
        <i className={h.grommet} />
        <span className={h.label}>Correction notice</span>
        <b className={h.tagStamp}>Rejected</b>
        <dl className={h.tagRows}>
          <dt>Item</dt>
          <dd>GFCI · line/load reversed</dd>
          <dt>Action</dt>
          <dd>Correct, call for re-inspection</dd>
        </dl>
        <p className={h.pain}>Failed inspection. Come back.</p>
      </div>

      {/* Customer callback */}
      <div className={`${h.card} ${h.phone}`} data-hassle>
        <div className={h.notice}>
          <div className={h.noticeHead}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1Z" />
            </svg>
            <span>Missed call (2)</span>
            <time>7:42 AM</time>
          </div>
          <b>Customer · kitchen job</b>
          <p>“The new outlet won’t reset. Can someone come back out today?”</p>
        </div>
        <p className={h.pain}>Callback. Unpaid trip.</p>
      </div>

      {/* Paper hours */}
      <div className={`${h.card} ${h.hours}`} data-hassle>
        <span className={h.label}>Weekly hours</span>
        <ul className={h.hoursRows}>
          <li><span>Mon</span><em>8</em></li>
          <li><span>Tue</span><em>9½</em></li>
          <li><span>Wed</span><em>8</em></li>
          <li><span>Thu</span><em className={h.smudge}>10?</em></li>
        </ul>
        <p className={h.pain}>Your experience lives on paper.</p>
      </div>

      {/* License across a state line */}
      <div className={`${h.card} ${h.license}`} data-hassle>
        <div className={h.licenseHead}>Electrician license</div>
        <div className={h.licenseBody}>
          <i className={h.portrait} />
          <dl>
            <dt>Issued</dt>
            <dd>Home state</dd>
            <dt>Working in</dt>
            <dd>New Jersey</dd>
          </dl>
        </div>
        <span className={h.licenseStamp}>Out of state?</span>
        <p className={h.pain}>New state. Does it carry over?</p>
      </div>

      {/* Apprentice asking for help */}
      <div className={`${h.card} ${h.chat}`} data-hassle>
        <span className={h.label}>Apprentice · 1st year</span>
        <div className={h.photo} aria-hidden="true">
          <svg viewBox="0 0 160 80">
            <path d="M0 52C30 30 46 70 80 44s52-18 80 6" />
            <path d="M0 34c26 14 52-20 82 4s48 12 78-8" />
            <path d="M10 80c18-30 50-26 66-58" />
          </svg>
        </div>
        <span className={h.bubble}>is this right??</span>
        <small className={h.delivered}>Delivered · no reply</small>
        <p className={h.pain}>Your boss is on another job.</p>
      </div>

      {/* Permit office */}
      <div className={`${h.card} ${h.permit}`} data-hassle>
        <div className={h.permitHead}>Permit application · electrical</div>
        <div className={h.field}><span>Job address</span><i /></div>
        <div className={h.field}><span>Scope of work</span><i /></div>
        <div className={h.field}><span>Which office?</span><i /></div>
        <span className={h.permitStamp}>Pending</span>
        <p className={h.pain}>Which form? Who signs off?</p>
      </div>

      {/* Unlabeled panel */}
      <div className={`${h.card} ${h.panel}`} data-hassle>
        <span className={h.label}>Panel directory</span>
        <ol className={h.circuits}>
          <li><span>1</span><em>Kit ctr</em></li>
          <li><span>2</span><em>???</em></li>
          <li><span>3</span><em>Dryer</em></li>
          <li><span>4</span><em className={h.blank} /></li>
          <li><span>5</span><em>Bath?</em></li>
          <li><span>6</span><em>??</em></li>
        </ol>
        <p className={h.pain}>Nothing’s labeled.</p>
      </div>
    </>
  );
}
