# Aniketh lane integration

No shared types, dependencies or other lanes changed.

- `LocationPicker` in `components/ar/LocationPicker.tsx` accepts `caseId` and `onConfirm(jurisdiction, point?)`. Andy can embed it on Checks. It is also available on the guide, even before approval. GPS is always real (including USE_MOCKS=true). Manual selection is explicitly labeled. Calls GET `/api/jurisdiction?lat=&lng=` then POST `/api/jurisdiction` with caseId, city, state and optional lat/lng on confirmation.
- Confirmation saves the canonical researched jurisdiction and fresh checks. A changed town/edition clears plan, AR progress and both review decisions. Sunny/Andy must generate a new plan after this; this lane does not manufacture one using the current placeholder builder.
- `runChecks(job)` returns sourced checks; only verified matched rules receive ruleId. Sunny should insert addsSteps only from verified rules referenced by found rule_difference checks. Exact supported components: `kitchen island receptacle`, `kitchen peninsula receptacle`. A wall countertop replacement has no verified difference in this dataset. Do not relabel it as an island to force AR steps.
- Model-edition differences are conditional on the NJ permit edition, existing-building scope and amendments being confirmed. `verified` verifies the model-code comparison, not project applicability.
- Guide GETs the shared case every 2 seconds, requires local confirmed + manager approved reviews and approved/guiding/done status. Only new_here steps display individually. Unknown overlay IDs (including reviewer-added steps) show text guidance without fabricated positions. No live tracking is claimed.
- POST `/job/[id]/guide/progress` `{stepId}` saves arProgress using `getCase`/`saveCase`, enforcing ordered idempotent progression. It invokes Zohaib's `updateCard(c, 'manager')`; card failures preserve progress and return `X-Boomer-Card-Sync: pending`. Backend owns delivery retries and distributed concurrency/authentication. Existing in-memory persistence is process-local; multi-instance Vercel needs Zohaib's durable store.
- Current scaffold's demoCase, buildPlan, mini app pages and free-text applyActions remain placeholders in other lanes. In particular applyActions currently does not update review decisions, so text-only approvals cannot unlock the guide until Zohaib fixes that. CardDecision endpoint does update review decisions.

## Research record — November 14 2026

Official sources read via web lookup:

- NJ DCA current codes: https://www.nj.gov/dca/codes/codreg/current.shtml — lists NEC 2023 adopted August 17 2026. The older consolidated NJAC PDF still describes NEC 2020, so do not infer project edition from that older PDF. Confirm transition/grace-period election with the official. Existing-building rehabilitation scope is unresolved.
- Philadelphia applicable codes: https://www.phila.gov/departments/department-of-licenses-and-inspections/resources/applicable-codes/ — lists NEC 2020. Exact project applicability still needs review.
- NFPA (code publisher): https://www.nfpa.org/news-blogs-and-articles/blogs/2023/01/18/kitchen-island-and-peninsula-receptacle-outlets-and-the-nec — verifies the two island/peninsula model-code changes recorded in rules.json. No claim that these require alteration of an existing wall-countertop receptacle.
- NJ ordinary maintenance: https://www.nj.gov/dca/codes/codreg/pdf_regs/njac_5_23.pdf §5:23-2.7 — replacement with like/similar receptacles in nonhazardous locations may be maintenance, with replacement protection provisions. Confirm current rule and actual scope; never blanket-exempt rewiring.
- Princeton https://www.princetonnj.gov/185/Building-Construction and https://www.princetonnj.gov/186/Building-Inspections — municipal permit office and electrical inspection service. No invented inspection schedule/fees.
- NJ Board https://www.njconsumeraffairs.gov/elec/ — electrical contractor license and business permit; worker/firm/exemption status must be confirmed. No invented automatic reciprocity.
- Philadelphia https://www.phila.gov/services/permits-violations-licenses/apply-for-a-permit/building-and-repair-permits/get-an-electrical-permit/ — electrical work, minor-maintenance exception, L&I and inspection/licensing coordination.

GFCI is intentionally not added as a new requirement for a countertop replacement. AFCI differences are not asserted without primary-source verification. No permit filing, official approval simulation, or compliance determination.

## Verification / rehearsal

Run `node lib/checks/verify.cjs`, `npm run typecheck`, `npm run build`.
Repo `npm run lint` currently opens Next's configuration wizard: no ESLint configuration/dependency is installed. Shared package changes are owned by the team.

Physical-device checks still required: HTTPS on iOS Safari and Android Chrome; deny camera/GPS permission; retry; photo fallback; portrait/landscape alignment on the stand; background/foreground the browser; approve both stages; complete steps and verify manager card. Fixed overlays use viewport-relative positions and a contained video to avoid cropping. Align using the stand; they do not track the outlet.

Nominatim is a public external service (8s timeout, process-local 1.1s rate limit, no background lookup, visible OSM attribution). Distributed rate limiting or a dedicated geocoder is needed beyond this single-process hackathon demo. Coordinates are disclosed as sent to OSM before GPS use. Manual fallback covers only the two researched towns. Location confirmation is worker confirmation, not proof of the address.
