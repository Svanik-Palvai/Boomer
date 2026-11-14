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
