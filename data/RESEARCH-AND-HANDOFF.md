# Aniketh v2 handoff

## Implemented software

- Existing shared contracts unchanged. Stable six `gfci-*` step IDs preserved for Sunny's engine and fake call. `jobTemplate()` validates structure, hard-gate check kinds and expected visual evidence, and returns independent copies.
- Removed the draft rule that falsely tagged a countertop GFCI swap as new in NJ. Both island/peninsula model-code comparisons remain source-backed, but do not tag countertop steps. The default demo correctly has zero New here steps. Do not claim two new steps in the script. Showing genuine New here steps requires a different, reviewed job scope; no second job is silently added.
- `differencesFor()` requires matching site edition and 2020 home edition, preventing same-edition or unknown-edition differences. Island rules remain contextual research (`tagsSteps: []`), not instructions to alter an existing installation.
- GPS always uses real reverse geocoding, including mock mode. Repeated exact-coordinate lookups cache for 60 seconds; public Nominatim requests are limited to one per 1.1 seconds per process. Manual fallback covers researched towns. Coordinates are not printed to logs. Multi-instance deployments need a dedicated geocoder or global limiter owned by the infrastructure lane.
- Jurisdiction route validates paired coordinates, accuracy, manual fields and boolean confirmation. Atomic `updateJob()` checks the latest job state after the network request: closed jobs cannot change; an active/attempted job cannot switch jurisdictions. A location change before work resets the plan through Sunny's existing builder. Unchanged GPS updates do not erase spoken confirmation. Manual town change clears old coordinates.
- Gap list is a stretch research checklist, not licensing eligibility. Only two narrow sourced entries are verified. Reciprocity, exact application requirements and Pennsylvania statewide transition remain explicitly needs review. No job record is treated as a license or credited experience.

## Official sources checked November 14 2026

- NJ adopted edition: https://www.nj.gov/dca/codes/codreg/current.shtml — NEC 2023; adoption August 17 2026. Confirm transition election and rehabilitation provisions with the official for existing work. The old consolidated NJAC PDF may still show 2020.
- Philadelphia: https://www.phila.gov/departments/department-of-licenses-and-inspections/resources/applicable-codes/ — NEC 2020 listed. Neither page determines the edition of an individual permit.
- NFPA publisher explanation: https://www.nfpa.org/news-blogs-and-articles/blogs/2023/01/18/kitchen-island-and-peninsula-receptacle-outlets-and-the-nec — island future provision and below-counter location changes; existing-work applicability remains for the official.
- Device manufacturer: https://leviton.com/content/dam/leviton/residential/product_documents/instruction_sheet/GFNT2_Instruction_Sheet_English.pdf — read both pages for the actual prop. The scaffold's assertion that reversed LINE/LOAD necessarily works while unprotected was inaccurate: this device has reset lockout. Other device models must use their own instructions. A photo does not establish supply identity, grounding continuity, torque or absence of voltage.
- NJ Board: https://www.njconsumeraffairs.gov/elec/ — contractor license and business permit. FAQ https://www.njconsumeraffairs.gov/elec/Pages/FAQ.aspx was not fully retrievable; no detailed current reciprocity/exam determination is verified from it. A proposal is not an adopted rule.
- Philadelphia credential: https://www.phila.gov/services/permits-violations-licenses/get-a-license/trade-licenses/get-an-electrical-contractor-license/
- Pennsylvania https://www.pa.gov/agencies/dos/department-and-offices/bpoa/boards-commissions/electricians has a State Board page. Older statements that there is no state board must not be repeated as current fact. Implementation details remain unverified.

## Human review remains pending

`data/steps.json` has explicit pending review metadata exposed through `templateReview()`. No electrician interview/review has been claimed. Before freeze, a working electrician must inspect the exact prop and edit/approve the demo instructions; record their identity, date and corrections in the metadata. These are demo instructions for a single-feed inert mock outlet, not a complete field installation procedure. All props stay disconnected. Spoken safety gates are simulated and labeled accordingly in the rehearsal.

## Harness and mock-wall setup — physical work

1. Secure a phone in a chest mount or a lanyard with two clips; ensure it cannot fall when leaning forward. No purchase was made by this software task.
2. Use a foam-board mock wall with an inert box, receptacle and disconnected conductors. Fit the actual GFCI whose instructions were reviewed. Keep LINE/LOAD markings visible; any colored tape must label both consistently, not encode which answer the checker should return.
3. Mount a fixed light so labels are readable without glare. At normal arm reach the work should occupy at least one third of the frame. Try mount height/angle and the available wide lens. A stand is the fallback.
4. On HTTPS, run Andy's camera page during a real call for ten minutes. Confirm wake lock, frame uploads every two seconds, burst requests and recovery after backgrounding. If the same phone suspends the browser during calls, use a second phone with earbuds for the call.
5. Rehearse both correct LINE and wrong LOAD connections in varied order five times each. Obscured labels, dim light or frames older than ten seconds must yield unclear rather than a guessed observation. Vision checker and frame freshness are Sunny's lane.
6. Confirm breaker-off and tester-result gates cannot be skipped; camera visibility never substitutes for worker test evidence. Inert props cannot electrically trip/reset: describe this as simulated, never an actual functional test.
7. End-to-end: resume a dropped call, repeat/why/go-back/stop, record photos and corrections, receive the record link. Harness alignment, contractor review and physical-device tests cannot be performed from this workspace.

## Integration notes

Andy: LocationPicker retains `jobId` / `onConfirm` and now uses shared route helpers. Embed it for visible GPS retry/manual fallback; the current camera page silently ignores GPS and HTTP errors, so that fallback must be wired in Andy's page. It is not changed here to respect ownership.
Sunny: use existing step templates and rules; do not announce two New here steps for gfci-swap. Template review is pending. Hard gates require meaningful explicit confirmations, not arbitrary text; current engine checks need review in your lane. Step engine, evidence policy, frame freshness and voice tools remain yours.
Zohaib: database update is synchronous through the documented callback; durable storage, caller matching and record closure are yours. API authentication follows the shared scaffold and is not invented here.

Validation: `node lib/location/verify.cjs`, `npm run check`, and `npm run fake-call` against a running server in mock mode. Mock checks demonstrate wiring of the flow, not accuracy of Gemini vision or a physical electrical test. Repo lint configuration is still absent; `npm run lint` launches the Next setup wizard.

## Executed verification

- Focused Node suite passed all template, rule, route, storage and location tests.
- Clean `npm run check` passed typecheck and production build. The first typecheck saw stale v1 `.next/types`; removing the generated cache resolved that without source changes.
- Full scaffold `fake-call` passed against the local v2 server with `USE_MOCKS=true`: repeat, two spoken gates, visual steps, one staged failed LINE check, correction, completion and record closure. Photon delivery and Gemini were mocked, not tested live.
- Live GET jurisdiction lookup for 40.3431, -74.6551 returned Princeton NJ / NEC 2023.
- Lint attempted; shared ESLint setup is missing and launches the configuration wizard.

## Follow-up audit

The geocoder now validates response shape before reading fields, normalizes network/timeout errors, and shares an in-flight request for identical coordinates. Concurrent callers receive independent objects. Added regression checks cover malformed/null responses, foreign locations, unknown US towns, throttling, transport and HTTP failures, duplicate requests and cached-object mutation. The location picker cancels a pending lookup on unmount, retains its timeout and reports timeout recovery. Review metadata is now validated; a reviewed status requires a reviewer identity and timestamp, while runtime template callers cannot mutate review metadata. All focused tests and a fresh `npm run check` pass after these changes. No shared types or other lanes were modified.
