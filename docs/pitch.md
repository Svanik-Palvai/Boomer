# Boomer judge pitch

The homepage is a self-contained scrolling pitch. The original screen directory is
preserved at `/demo`; existing profile, camera, live-job, record and lesson URLs
are unchanged. Andy's homepage is the only existing screen replaced by this work.
All presentation logic, data and styles live under `components/pitch/`, with local
artwork/fonts and provenance under `public/pitch/`.

## Narrative and controls

The opening is a pinned scene: scattered jurisdiction/work-history fragments
converge into Boomer, then connectors draw three worker-centered capabilities.
A second scene moves an experience marker from Philadelphia to Princeton and
reveals local context. The record scene animates the message and unfolds the
portable job record. All three scenes scrub forward AND backward with scroll,
using requestAnimationFrame and DOM transforms rather than a new animation library.
Phones, short landscape viewports and reduced-motion users get stacked static
content. Source/scope detail stays accessible in a disclosure below the border story.

The story continues through a phone/harness/voice setup,
a staged LINE/LOAD correction, the portable record, reviewed lessons, architecture
and the real demo setup. The company rail shows industry examples only. Neither
those companies nor the reference sites are represented as partners or customers.

The correction is an isolated local replay. It never calls product APIs, requests
camera/location/microphone permission, changes jobs, or starts provider services.
Desktop scrolling selects its four beats; Back/Next/Replay switches to manual
control until reload. Narrow layouts and reduced-motion users use the controls.
With JavaScript disabled, all four responses are rendered as an ordered list.
The logo rail pauses on user request, keyboard focus or hover. Reduced motion
replaces it with a static wrapping set of marks. Image errors show company names.

## Integration

No shared type, dependency, backend or provider changes are required for the pitch.
Jurisdiction editions, source URLs and caveats come from existing towns.json.
The wall-countertop GFCI example does not claim a Philadelphia/Princeton difference.
Licensing is a separate confirmation, not a benefit conferred by the work record.

The lessons section links the actual library and explicitly says real-session
acceptance remains. It does not display an invented published lesson. Do not add
traction counts, interview quotes, live call numbers or deployment status without
evidence. The final demo button opens the real product screen directory; actual
calls still require the configured deployment and providers.

The original Vercel project is retired. The repository owner's replacement must
deploy this branch or merge the reviewed PR before the new homepage is visible.
No Vercel deployment was recreated by this change.

## Checks performed

- Production build and TypeScript checks.
- Existing location/rule verification and lesson policy/API/queue tests.
- Existing full mock guided-call regression, including the caught mistake.
- Browser screenshots at 390, 768 and 1440 CSS pixels; no horizontal overflow.
- Replay Next/Back/Replay state and corrected LINE diagram; forward/backward
  desktop scrolling changes the replay in both directions.
- Keyboard skip link has a visible focus outline.
- New opening, border and record scenes were checked scrubbing forward/backward.
- Reduced motion produces no rail animation, removes pinning and shows all capabilities.
- JavaScript-disabled page retains the opening, all three capabilities and all four replay responses.
- Browser network capture found no /api/ requests from the pitch.
- Logo error handler exercised with the React test renderer: failed image is
  removed and the readable company name/link remain.

The plugin catalog did not contain Impeccable. No substitute plugin was installed
or claimed used. The reference pitch's source and Caterpillar assets were not
copied. Company logo sources and font license are documented in public/pitch.

## Run locally and find the changes

Run `npm run dev -- --port 3300` and open http://localhost:3300 to edit, or
`npm run check` followed by `npm run start -- --port 3300` for the production build.
Stop the running server before rebuilding `.next`.

The changes are on `codex/reviewed-video-lessons` and PR #6. They do not change
GitHub's default `main` view or a main-only deployment until the PR is merged.
The newest teammates' main changes were merged through a82682c. The post-call
webhook conflict was comment-only: both lesson evidence capture and the new
pick-up text behavior were retained.

## Agent, sponsor and demo-console presentation

`/demo` is a styled field console with worker-phone setup, the judge's live
monitor, job/work records and links to the actual Photon mini-app sheets. It
shows the configured AI mode, never a fabricated online/provider-ready indicator.
A call link appears only for a configured E.164 Photon number; no number is
invented when it is absent. The camera/call screens retain their original routes.

The pitch names the actual architecture: one ElevenLabs voice agent reached on
a Photon SIP number plus signup, recorder and sharing text-agent workflows.
The four-node map supports manual inspection or following the scroll. On desktop,
manual selection also brings the matching explanation into view. Text agents are
not represented as independent voice models. The nine displayed voice tools were
checked against lib/agent/tools.ts, and every code evidence path exists.

Six judging views map the team brief to implemented features: Photon Best Voice
Agent, Photon iMessage, MLH Gemini, Amazon Practical AI, Peri Forward Deployed,
and Business & Enterprise. Photon 2.0 voice/text and Photon 1.0 mini apps are
explicitly distinguished. No AWS usage, prize eligibility, live provider success,
customer traction or electrical certification is inferred from the pitch.

The user reports consultations with all companies in the industry rail. The Peri
view records that as a team-reported statement; individual interviewee names,
roles, quotations and evidence links remain placeholders for later team input.
The logo rail still does not imply a customer relationship or endorsement.

Personal technical role labels were removed from the public team footer; the
names remain. CONTRIBUTING ownership information remains intact for collaboration.

Validation for this revision includes all six track selections, all four agent
selections and return-to-scroll behavior, 390/768/1440 layout/overflow checks,
HTTP checks for the linked product/mini-app routes, and no-script availability of
all four descriptions and all six track summaries. Browser interaction produced
no product API requests. The local production preview is available on port 3300.
