# Boomer local-code RAG: data and proposed implementation

Goal: an experienced electrician who moved (example: Phoenix, AZ → Las Vegas, NV) asks Boomer, on the call or by text,
"what's different here?" or a specific question ("can I bury EMT here?"). Boomer answers in one or two sentences,
says "source says", cites the local document, and saves the source to the job record. Same safety wording as the
rest of the app: Boomer never says "compliant", "code-approved" or "safe"; the electrician and the local AHJ decide.

Nothing in the app code was changed. Everything here is data plus this proposal.

## What is in this folder

| Path | What |
| --- | --- |
| `sources/az/` | 23 docs: Phoenix 2023 NEC amendments (Ord. G-7397, eff. 2025-08-01), Phoenix permit/admin chapter, submittal reqs, code history; Maricopa County 2022 addenda (2017 NEC, in force) and 2026 draft (2023 NEC, **pending**); Tucson 2023 amendments; ARS 11-861, 32-1121/1122/1151; APS and SRP utility manuals. `manifest.json` has 28 entries. |
| `sources/nv/` | 24 docs: Southern Nevada 2023 NEC amendments (Clark County eff. 2026-01-11; Las Vegas copy eff. 2026-01-05), Clark Ord. 5275, Clark/LV admin codes, 4 Clark field inspection guidelines, NAC 624, 4 Contractors Board pages, NV Energy service rules, State Fire Marshal memo, Northern Nevada amendments, Washoe/Reno. `manifest.json` has 28 entries. |
| `sources/ny/` | New York City: 2025 NYC Electrical Code, the full set of NYC amendments to the **2020** NEC (in force 2025-12-21); Local Law 128 of 2024 and Local Law 42 of 2026; DOB permit, filing and license pages; NYS 2025 Uniform Code (2023 NEC, outside NYC). 13 entries. |
| `sources/nj/` | Princeton / New Jersey: N.J.A.C. 5:23-3.16 electrical subcode (2023 NEC + TIAs, in force 2026-08-17, with NJ deletions), the full UCC (maintenance, minor work, permits, rehab subcode), DCA notices, the journeyman licensing law, Princeton permit and inspection pages. 14 entries. |
| `sources/il/` | Chicago: 2017-NEC-based Chicago Electrical Code adoption, permit and inspection pages, supervising electrician and contractor licenses, the Illinois contractor-registration statute and EV installer rules, ComEd service requirements. The code text itself is link-only (blocked / NFPA copyright). 20 entries. |
| `sources/pa/` | Philadelphia: 2020 NEC (mandatory 2026-07-01) and local changes, emergency-disconnect FAQ, permits, private inspection agencies, contractor license; Pennsylvania UCC; Act 108 of 2026 (state licensing, pending). 16 entries. |
| `sources/ca/` | Los Angeles: 2025 California Electrical Code (2023 NEC, in force 2026-01-01); LA electrical pages from Ord. 188797; LA County Title 27; LADBS permits and inspections; state electrician certification and contractor (CSLB) C-10 and reciprocity pages; LADWP 2025 service requirements. 27 entries. |
| `sources/tx/` | Houston: Texas 2026 NEC (in force 2026-09-01); Houston's 2023-NEC amendments and its 2026 notice; permits, inspections, master and contractor registration; Texas licensing pages (journeyman, master, reciprocity) and statute. 29 entries. |
| `sources/national/` | `nec-adoption-by-state.json` (53 rows), `electrician-licensing-by-state.json` (52), `nec-edition-changes.json` (40 changes 2017→2026, own-words summaries), `lookup-services.json` (Census geocoder, FCC Area API, …). |
| `jurisdictions.json` | Hand-built registry of 29 jurisdictions: each one's NEC edition, effective date, parent chain (city → region → state), and which source docs apply. Retrieval is filtered by this. |
| `corpus/chunks.jsonl.gz` | 8,712 retrieval chunks (gzipped, 2.5 MB): 647 `fact` (verified one-liners from manifests), 7,920 `doc` (section-aware splits of the texts), 145 `row` (national tables). `corpus/index.json` = per-source counts. |
| `build_corpus.py` | Rebuilds `corpus/` from the manifests: `python3 -I data/rag/build_corpus.py data/rag` |
| `eval/questions.json` | 24 test questions with expected sources/NEC sections, across all 8 metro areas. |
| `eval/bm25_baseline.py` | Keyword-only baseline. Current result: **22/24** questions retrieve an expected source in the top 8. The two misses ("who inspects the service… meter" in Las Vegas, "pull a permit in Houston with my master license") phrase things differently from their sources, which is the job of the semantic half. |

Every manifest entry has `url`, `retrievedAt`, `status` (`in_force` / `pending` / `superseded` / `unknown`), `copyright`, and `keyFacts` that cite a page or section.

**How files are stored.** Most documents are kept as the `.txt` extract only. The manifest records the original's `url`, byte size and `sha256` under `original`, so it can be re-fetched and checked. This cut storage from about 150 MB of PDF/HTML to 31 MB. The original is kept (`storedAs: "original+text"`) in two cases:
- **Amendment documents:** strikethrough and underline show deleted versus added code text, and the text extract loses that.
- **Scanned documents:** the text extract is incomplete. These are the Clark County ordinance, the Nevada fire marshal memo and the Princeton fee schedule.

## Edition snapshot (as of 2026-11-14)

| Jurisdiction | NEC base | In force | Who licenses the individual electrician |
| --- | --- | --- | --- |
| Phoenix, AZ | 2023 + Phoenix amendments | 2025-08-01 | Nobody: Arizona licenses contractors only (ROC) |
| Las Vegas / Clark County, NV | 2023 + Southern Nevada amendments | 2026-01-05 / 2026-01-11 | Local card (ESP-administered, ICC exams); NSCB licenses contractors (C-2) |
| New York City | **2020** + NYC amendments | 2025-12-21 | NYC DOB master / special electrician licenses |
| Princeton, NJ | 2023 + NJ deletions (statewide UCC) | 2026-08-17 | NJ Board: contractor, Class A journeyman, Class B wireman |
| Chicago, IL | **2017**-based Chicago Electrical Code | 2018-03-01 | Chicago supervising electrician (city exam); no Illinois state license |
| Philadelphia, PA | 2020 + local changes | 2026-07-01 | Philadelphia contractor license; PA state board created by Act 108, not yet in force |
| Los Angeles, CA | 2023 via 2025 CEC + LA amendments | 2026-01-01 | California DIR certification required before working; CSLB C-10 for contractors |
| Houston, TX | **2026** (statewide) | 2026-09-01 | Texas TDLR licenses statewide; Houston registration to pull permits |

This spread is why the edition must come from the registry, never from the model. A worker moving from Chicago to Houston jumps three NEC editions (2017 to 2026). A worker moving from Princeton to NYC goes back one edition.

## Example: what the data says changes for a Phoenix electrician in Las Vegas

Both are on the 2023 NEC, so the model-code edition diff is empty. The differences are local amendments and licensing:

- **Grounding electrodes:** a concrete-encased (Ufer) electrode is required for new buildings, and plate and pipe electrodes are not allowed (SNBO amendments, 250.50/250.52).
- **Conduit:** exposed PVC must be Schedule 80 (352.10(G)). EMT can't go underground or in concrete that touches earth (358.12).
- **Service disconnect location:** amended 230.70. It must be outside, within 12 ft of the building, or in a dedicated electrical room with direct outside access, 1-hour fire separation and fire department access. It can never be in a bathroom.
- **Kitchen islands:** Phoenix allows a receptacle below the counter again (210.52(C)). Southern Nevada requires a box for a future island receptacle.
- **Equipment grounding:** Phoenix requires a wire equipment ground with EMT (250.118). Southern Nevada requires one in exterior raceways with compression fittings.
- **Other Southern Nevada rules:** abandoned cable must be removed (110.12(D)), and adjustable breaker settings must be posted at the equipment (110.12(F)).
- **Who can do the work:** Arizona has no individual electrician license. In Southern Nevada, a card holder (master, qualified individual or journeyman) must be on site.
  - The cards are run by Electrical Safety Professionals (ESP), and new cards need the 2023 NEC-based ICC exams (R-17 or R-18).
  - The contractor's Nevada C-2 license is separate from the card. An Arizona CR-11 held for 4 years can waive the Nevada trade exam, but not the business and law exam.

## Proposed implementation

### 1. Work out the jurisdiction with structured data, not retrieval
GPS → (existing `getJurisdiction()`), plus Census geocoder for county FIPS and incorporated-place check →
pick `jurisdictions.json` entry: incorporated city if listed, else county, else state. Walk `parents` to get the
chain (e.g. `las-vegas-nv → southern-nevada → nv`). The **edition and effective date always come from the registry**,
never from the model. `status: unknown` → Boomer says it can't confirm the edition and to ask the building department.
(Phoenix vs. unincorporated Maricopa is the trap: 2023 vs. 2017 NEC a few miles apart.)

### 2. Store the chunks: Supabase pgvector (the app already uses Supabase), in-memory fallback
```sql
create extension if not exists vector;
create table rag_chunks (
  id text primary key, kind text, text text, embedding vector(768),
  source_id text, jurisdiction_ids text[], state text, level text, doc_type text,
  nec_edition text, nec_sections text[], status text, url text, redistributable bool,
  tsv tsvector generated always as (to_tsvector('english', text)) stored
);
create index on rag_chunks using hnsw (embedding vector_cosine_ops);
create index on rag_chunks using gin (tsv);
create index on rag_chunks using gin (jurisdiction_ids);
```
`jurisdiction_ids` is filled at load time from `jurisdictions.json` (source → every jurisdiction that lists it).
Embeddings: Gemini `gemini-embedding-001` at 768 dims (task type `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY`); 3.2k chunks ≈ one batch job, a few cents.
For the demo / `USE_MOCKS`, load `chunks.jsonl.gz` + a precomputed `embeddings.f32` into memory and do cosine in JS (about 9k × 768 floats, roughly 27 MB, which is fine for one server process).

### 3. Search: filtered hybrid with section-number boosting
1. **Filter:** `jurisdiction_ids && site chain` (plus the home chain for a "what's different" question), `status in ('in_force')` (allow `pending` only when explicitly labelled), and national `row` chunks for the two states.
2. **Search two ways:** Postgres full-text search for keywords, and vector top-k for meaning. Exact NEC section numbers ("358.12") matter a lot, so if the question contains or implies a section, chunks whose `nec_sections` contain it get a boost.
3. **Merge:** reciprocal rank fusion, then prefer `fact` and `local_amendment` chunks. Keep 6–8.
4. A section map per job type (e.g. receptacle → 210.8, 210.12, 210.52, 406.x) lets a "what's different" question search without the worker naming sections.

### 4. Write a grounded answer that can be checked
Gemini (`callGemini`, the existing timeout/retry) gets the chunks with IDs and must return JSON:
`{ answer: string (≤2 sentences), claims: [{ text, chunkIds[] }], confidence: "source_says" | "not_found" }`.
Server-side check: drop any claim whose chunk IDs weren't in the context; if nothing survives, the answer becomes
"I don't have a local source for that. Ask the building department or your supervisor." Spoken answer starts with
"Source says…" and names the document ("Southern Nevada amendments, 358.12"). Base NEC text is **not** in the corpus
(NFPA copyright), so for model-code questions Boomer names the section to look up instead of quoting it.

### 5. Where it plugs in (owners decide; nothing edited)
- **Voice tool** `ask_local_code { question }` → `/api/voice/local-code`, next to the existing tools in `lib/agent/tools.ts`. Target < 3 s. At job start, after the town is confirmed, precompute a "local brief" (the diff search above for the job type) and cache it on the job, so `explain_step` and the first "what's different?" are instant.
- **Record:** every cited source is saved to the job record, the same way `sourceUrl` is today.
- **rules.json stays the source of truth for New here tags.** The RAG *proposes* rules (an offline script writes candidates with `verified: false` + chunk citations); a human promotes them into `rules.json`. This keeps the team rule "no rule shown as fact unless `verified: true`."
- **Gap list:** the same pipeline over `licensingSources` + the national licensing table produces `gaps.json` candidates for any state pair (AZ→NV: Southern Nevada card through ESP, C-2 via endorsement, business & law exam).

### 6. Keeping it current
- Each answer shows the `asOf` date of its source.
- A weekly job re-fetches each manifest `url`, compares its hash, and flags changed docs for review. Things to watch:
  - Maricopa County's 2026 draft becoming adopted.
  - Phoenix's 2027-03-01 date for HVAC GFCI enforcement.
  - Florida and Washington moving to the 2026 NEC.
- Run `eval/` after every rebuild. A target worth holding is 12 of 12 questions finding the right source in the top 5, with a correct cited answer.

## Known gaps / cautions
- **Blocked sites:** these returned bot checks or 403 errors, so they're unverified:
  - The Arizona Registrar of Contractors (R-11/C-11/CR-11 scopes and reciprocity).
  - Henderson and North Las Vegas.
  - Scottsdale and Tempe current editions.
  - Mesa amendments (only the adoption page summary was captured).
- **Card program:** Las Vegas card experience-hour requirements come from ESP, not an official county text. Card facts are link-only.
- **National tables:** 44 of 53 adoption rows rest on NFPA's table (as of 2026-08-03) without a state-page check. Most licensing rows come from a 2021 blog post and are marked low-medium confidence.
- **Lost formatting:** the Phoenix amendment text extraction loses strikethrough and underline, so check the PDF for exact amended wording.
- **Copyright:**
  - Some utility manuals are proprietary ("all rights reserved"): APS and SRP (`sources/az/aps-*`, `srp-*`), and the ComEd, PECO and LADWP entries where marked. They're kept as text extracts only, flagged `redistributable: false`, and tracked in the repo by the team's choice. Don't show their text verbatim in the app; cite them by link.
  - Government amendment documents are fine to include; the Southern Nevada amendments say they may be copied without permission.
- **Gaps in the new cities:**
  - **New Jersey:** the Board of Examiners site and N.J.A.C. 13:31 (licensing rules, reciprocity) were blocked. Princeton's serving utility isn't confirmed.
  - **Chicago:** Title 14E full text is link-only, and the 2026 transition memo PDF was blocked.
  - **Pennsylvania:** Act 108 details come from a law-firm summary only. PECO's current service manual wasn't found.
  - **Houston:** no 2026-NEC amendment document exists yet, so treat its 2023 amendments as needs-review.
  - **Los Angeles:** the exact Ord. 188797 publication date isn't stated. The full LA Municipal Code and the CenterPoint standards are link-only.
- **Mismatch with `data/rules.json`:** New Jersey deletes NEC 210.12(E), the AFCI requirement for wiring extensions, modifications and replacements (see `sources/nj/njac-5-23-3-subcodes.txt`). This matters for the Princeton receptacle job, and `rules.json` doesn't have it yet. That file belongs to Aniketh.
